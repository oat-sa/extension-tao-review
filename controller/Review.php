<?php

/**
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; under version 2
 * of the License (non-upgradable).
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 *
 * Copyright (c) 2019 (original work) Open Assessment Technologies SA;
 *
 *
 */

namespace oat\ltiTestReview\controller;

use common_Exception;
use common_exception_ClientException;
use common_exception_Error;
use common_exception_NotFound;
use common_exception_Unauthorized;
use core_kernel_users_GenerisUser;
use oat\generis\model\GenerisRdf;
use oat\generis\model\OntologyAwareTrait;
use oat\ltiTestReview\models\DeliveryExecutionFinderService;
use oat\ltiTestReview\models\QtiRunnerInitDataBuilderFactory;
use oat\tao\model\http\HttpJsonResponseTrait;
use oat\tao\model\mvc\DefaultUrlService;
use oat\taoLti\models\classes\LtiClientException;
use oat\taoLti\models\classes\LtiException;
use oat\taoLti\models\classes\LtiInvalidLaunchDataException;
use oat\taoLti\models\classes\LtiMessages\LtiErrorMessage;
use oat\taoLti\models\classes\LtiService;
use oat\taoLti\models\classes\LtiVariableMissingException;
use oat\taoLti\models\classes\TaoLtiSession;
use oat\taoProctoring\model\execution\DeliveryExecutionManagerService;
use oat\taoQtiTestPreviewer\models\ItemPreviewer;
use oat\taoResultServer\models\classes\ResultServerService;
use tao_actions_SinglePageModule;

/**
 * Review controller class thar provides data for js-application
 * @package oat\ltiTestReview\controller
 */
class Review extends tao_actions_SinglePageModule
{
    use OntologyAwareTrait;
    use HttpJsonResponseTrait;

    /** @var TaoLtiSession */
    private $ltiSession;

    /**
     * @throws LtiException
     * @throws common_exception_Error
     */
    public function __construct()
    {
        parent::__construct();

        $this->ltiSession = LtiService::singleton()->getLtiSession();
    }

    /**
     * @throws LtiException
     * @throws LtiInvalidLaunchDataException
     * @throws LtiVariableMissingException
     * @throws common_exception_Error
     * @throws common_exception_NotFound
     * @throws common_Exception
     */
    public function index(): void
    {
        $launchData = $this->ltiSession->getLaunchData();
        $finder = $this->getDeliveryExecutionFinderService();
        $deliveryId = $this->getDeliveryId();

        if ($deliveryId === null) {
            $execution = $finder->findDeliveryExecution($launchData);
        } else {
            $execution = $finder->findLastExecutionByUserAndDelivery($launchData, $deliveryId);
            if ($execution === null) {
                throw new LtiClientException(
                    __('Available delivery executions for review does not exists'),
                    LtiErrorMessage::ERROR_INVALID_PARAMETER
                );
            }
        }
        $delivery = $execution->getDelivery();

        $urlRouteService = $this->getDefaultUrlService();
        $this->setData('logout', $urlRouteService->getLogoutUrl());

        $data = [
            'execution' => $execution->getIdentifier(),
            'delivery' => $delivery->getUri(),
            'show-score' => (int) $finder->getShowScoreOption($launchData),
            'show-correct' => (int) $finder->getShowCorrectOption($launchData)
        ];

        $this->composeView('delegated-view', $data, 'pages/index.tpl', 'tao');
    }

    /**
     * @throws common_Exception
     */
    public function init(): void
    {
        $dataBuilder = $this->getQtiRunnerInitDataBuilderFactory();
        $params = $this->getPsrRequest()->getQueryParams();

        try {
            $data = [];
            if (!empty($params['serviceCallId'])) {
                $finder = $this->getDeliveryExecutionFinderService();
                $this->checkPermissions($params['serviceCallId']);
                $data = $dataBuilder->create()->build(
                    $params['serviceCallId'],
                    $finder->getShowScoreOption($this->ltiSession->getLaunchData())
                );
            }
            $this->setSuccessJsonResponse($data);
        } catch (common_exception_ClientException $e) {
            $this->logError($e->getMessage());
            $this->setErrorJsonResponse($e->getUserMessage(), $e->getCode());
        }
    }

    /**
     * Provides the definition data and the state for a particular item
     *
     * @throws LtiVariableMissingException
     * @throws \common_exception_InconsistentData
     * @throws common_Exception
     * @throws common_exception_Error
     * @throws common_exception_NotFound
     */
    public function getItem(): void
    {
        try {
            $params = $this->getPsrRequest()->getQueryParams();

            $deliveryExecutionId = $params['serviceCallId'];
            $itemDefinition = $params['itemUri'];

            $execution = $this->getDeliveryExecutionManagerService()->getDeliveryExecutionById($deliveryExecutionId);

            $this->checkPermissions($deliveryExecutionId);

            $itemPreviewer = new ItemPreviewer();
            $itemPreviewer->setServiceLocator($this->getServiceLocator());

            $itemPreviewer
                ->setItemDefinition($itemDefinition)
                ->setUserLanguage($this->getUserLanguage($deliveryExecutionId))
                ->setDelivery($execution->getDelivery());

            $itemData = $itemPreviewer->loadCompiledItemData();

            $finder = $this->getDeliveryExecutionFinderService();

            if (
                !empty($itemData['data']['responses'])
                && $finder->getShowCorrectOption($this->ltiSession->getLaunchData())
            ) {
                $responsesData = array_merge_recursive(...[
                    $itemData['data']['responses'],
                    $itemPreviewer->loadCompiledItemVariables()
                ]);

                // make sure the responses data are compliant to QTI definition
                $itemData['data']['responses'] = array_filter(
                    $responsesData,
                    static function (array $dataEntry): bool {
                        return array_key_exists('qtiClass', $dataEntry)
                            && array_key_exists('serial', $dataEntry)
                            && $dataEntry['qtiClass'] !== 'modalFeedback';
                    }
                );
            }

            $response['content'] = $itemData;
            $response['baseUrl'] = $itemPreviewer->getBaseUrl();
            $response['success'] = true;

            $this->returnJson($response);
        } catch (common_exception_ClientException $e) {
            $this->logError($e->getMessage());
            $this->returnJson([
                'success' => false,
                'type' => 'error',
                'message' => $e->getUserMessage()
            ]);
        }
    }

    /**
     * @throws common_exception_Error
     */
    protected function getUserLanguage(string $resultId): string
    {
        /** @var ResultServerService $resultServerService */
        $resultServerService = $this->getServiceLocator()->get(ResultServerService::SERVICE_ID);
        /** @var \taoResultServer_models_classes_ReadableResultStorage $implementation */
        $implementation = $resultServerService->getResultStorage();

        $testTaker = new core_kernel_users_GenerisUser($this->getResource($implementation->getTestTaker($resultId)));
        $lang = $testTaker->getPropertyValues(GenerisRdf::PROPERTY_USER_DEFLG);

        return empty($lang) ? DEFAULT_LANG : (string) current($lang);
    }

    /**
     * @throws common_exception_Unauthorized
     */
    protected function checkPermissions(string $serviceCallId): void
    {
        $execution = $this->getDeliveryExecutionManagerService()->getDeliveryExecutionById($serviceCallId);

        if ($execution->getIdentifier() !== $serviceCallId) {
            throw new common_exception_Unauthorized($serviceCallId);
        }
    }

    private function getDeliveryExecutionFinderService(): DeliveryExecutionFinderService
    {
        return $this->getPsrContainer()->get(DeliveryExecutionFinderService::SERVICE_ID);
    }

    private function getDeliveryExecutionManagerService(): DeliveryExecutionManagerService
    {
        return $this->getPsrContainer()->get(DeliveryExecutionManagerService::SERVICE_ID);
    }

    private function getDefaultUrlService(): DefaultUrlService
    {
        return $this->getPsrContainer()->get(DefaultUrlService::SERVICE_ID);
    }

    private function getQtiRunnerInitDataBuilderFactory(): QtiRunnerInitDataBuilderFactory
    {
        return $this->getPsrContainer()->get(QtiRunnerInitDataBuilderFactory::SERVICE_ID);
    }

    private function getDeliveryId(): ?string
    {
        return $this->getPsrRequest()->getQueryParams()['delivery'] ?? null;
    }
}

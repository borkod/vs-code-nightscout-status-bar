import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as extension from '../extension';
import * as https from 'https';
import { ClientRequest } from 'http';

suite('Nightscout Status Bar Extension Tests', () => {
    let sandbox: sinon.SinonSandbox;
    let context: vscode.ExtensionContext;

    setup(() => {
        sandbox = sinon.createSandbox();
        context = {
            subscriptions: []
        } as unknown as vscode.ExtensionContext;
    });

    teardown(() => {
        sandbox.restore();
    });

    test('Extension should activate and initialize properly', async () => {
        await extension.activate(context);

        // Check that the status bar item is created
        assert.ok(extension.myStatusBarItem, 'Status bar item is not created.');

        // Check that the status bar item is shown
        assert.strictEqual(extension.myStatusBarItem.text, '---', 'Status bar item text is not initialized correctly.');
        assert.ok(extension.myStatusBarItem.visible, 'Status bar item is not visible.');
    });

    test('Configuration should load correctly', () => {
        // Mock configuration
        const getConfigurationStub = sandbox.stub(vscode.workspace, 'getConfiguration');
        // getConfigurationStub.withArgs('nightscout-status-bar').returns({
        //     get: <T>(section: string, defaultValue?: T): T | undefined => {
        //         const configValues: { [key: string]: any } = {
        //             'glucoseUnits': 'millimolar',
        //             'nightscoutHost': 'test-host',
        //             'token': 'test-token',
        //             'low-glucose-warning.enabled': true,
        //             'high-glucose-warning.enabled': true,
        //             'low-glucose-warning.value': 65,
        //             'high-glucose-warning.value': 160
        //         };
        //         if (section in configValues) {
        //             return configValues[section] as T;
        //         } else {
        //             return defaultValue;
        //         }
        //     }
        // });

        const configurationStub = sinon.createStubInstance<vscode.WorkspaceConfiguration>(
            Object as any
        );
        
        configurationStub.get.callsFake(<T>(section: string, defaultValue?: T): T | undefined => {
            const configValues: { [key: string]: any } = {
                'glucoseUnits': 'millimolar',
                'nightscoutHost': 'test-host',
                'token': 'test-token',
                'low-glucose-warning.enabled': true,
                'high-glucose-warning.enabled': true,
                'low-glucose-warning.value': 65,
                'high-glucose-warning.value': 160
            };
            if (section in configValues) {
                return configValues[section] as T;
            } else {
                return defaultValue;
            }
        });
        
        getConfigurationStub.withArgs('nightscout-status-bar').returns(configurationStub as any);

        // Call updateConfig
        extension.updateConfig();

        // Verify configuration
        assert.strictEqual(extension.myConfig.glucoseUnits, 'millimolar');
        assert.strictEqual(extension.myConfig.nightscoutHost, 'test-host');
        assert.strictEqual(extension.myConfig.token, 'test-token');
        assert.strictEqual(extension.myConfig.lowGlucoseWarningEnabled, true);
        assert.strictEqual(extension.myConfig.highGlucoseWarningEnabled, true);
        assert.strictEqual(extension.myConfig.lowGlucoseThreshold, 65);
        assert.strictEqual(extension.myConfig.highGlucoseThreshold, 160);
    });

    test('Status bar item should update with fetched data', async () => {
        // Mock fetchData to return test data
        const fetchDataStub = sandbox.stub(extension, 'fetchData').resolves({
            sgv: 180,
            direction: 'Flat',
            date: Date.now()
        });

        // Call updateStatusBarItem
        await extension.updateStatusBarItem();

        // Verify status bar item text
        assert.ok(extension.myStatusBarItem.text.includes('180.0 mg/dL →'), 'Status bar item text is incorrect.');

        fetchDataStub.restore();
    });

    test('Should handle fetchData errors gracefully', async () => {
        // Mock fetchData to throw an error
        const fetchDataStub = sandbox.stub(extension, 'fetchData').rejects(new Error('Test error'));
        const showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage');

        // Call updateStatusBarItem
        await extension.updateStatusBarItem();

        // Verify error handling
        assert.strictEqual(extension.myStatusBarItem.text, '---', 'Status bar item text should be "---" on error.');
        assert.ok(showErrorMessageStub.calledWithMatch('Error fetching data: Test error'), 'Error message not shown.');

        fetchDataStub.restore();
        showErrorMessageStub.restore();
    });

    test('fetchData should handle successful response', async () => {
        // Mock https.get
        const httpsGetStub = sandbox.stub(https, 'get').callsFake((_options: any, callback: any) => {
            const res = new (require('stream').Readable)();
            res.statusCode = 200;
            res.headers = {
                'content-type': 'application/json'
            };
            callback(res);
            res.push(JSON.stringify([{ sgv: 150, direction: 'SingleUp', date: Date.now() }]));
            res.push(null);
            return {
                on: sandbox.stub(),
                end: sandbox.stub()
            } as unknown as ClientRequest;
        });

        const data = await extension.fetchData();
        assert.strictEqual(data.sgv, 150, 'SGV value incorrect.');
        assert.strictEqual(data.direction, 'SingleUp', 'Direction value incorrect.');

        httpsGetStub.restore();
    });

    test('fetchData should handle HTTP errors', async () => {
        // Mock https.get to simulate HTTP error
        const httpsGetStub = sandbox.stub(https, 'get').callsFake((_options: any, callback: any) => {
            const res = new (require('stream').Readable)();
            res.statusCode = 404;
            res.headers = {};
            callback(res);
            res.push(null);
            return {
                on: sandbox.stub(),
                end: sandbox.stub()
            } as unknown as ClientRequest;
        });

        try {
            await extension.fetchData();
            assert.fail('fetchData did not throw an error on HTTP error.');
        } catch (error) {
            assert.strictEqual((error as Error).message, 'Request Failed. Status Code: 404', 'Error message incorrect.');
        }

        httpsGetStub.restore();
    });

    test('getTrendIcon should return correct icon', () => {
        assert.strictEqual(extension.getTrendIcon('Flat'), '→', 'Icon for "Flat" direction incorrect.');
        assert.strictEqual(extension.getTrendIcon('SingleUp'), '↑', 'Icon for "SingleUp" direction incorrect.');
        assert.strictEqual(extension.getTrendIcon('DoubleDown'), '↓↓', 'Icon for "DoubleDown" direction incorrect.');
        assert.strictEqual(extension.getTrendIcon('Unknown'), '??', 'Icon for unknown direction incorrect.');
    });

    test('showWarning should display appropriate warnings', () => {
        // Mock showWarningMessage
        const showWarningMessageStub = sandbox.stub(vscode.window, 'showWarningMessage');

        // Set up test data
        extension.currentResult = { sgv: 60, direction: 'Flat', date: Date.now() };
        extension.myConfig.lowGlucoseWarningEnabled = true;
        extension.myConfig.lowGlucoseThreshold = 70;

        // Call showWarning
        extension.showWarning();

        // Verify warning
        assert.ok(showWarningMessageStub.calledWith('Low blood glucose!'), 'Low glucose warning not displayed.');

        showWarningMessageStub.restore();
    });

    test('Command should update status bar and show date', async () => {
        // Mock updateStatusBarItem
        const updateStatusBarItemStub = sandbox.stub(extension, 'updateStatusBarItem').resolves();

        // Mock showInformationMessage
        const showInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage');

        // Set up test data
        extension.currentResult = { sgv: 100, direction: 'Flat', date: Date.now() };

        // Execute command
        await vscode.commands.executeCommand('nightscout-status-bar.update-and-show-date');

        // Verify that updateStatusBarItem was called
        assert.ok(updateStatusBarItemStub.called, 'updateStatusBarItem was not called.');

        // Verify that information message was shown
        assert.ok(showInformationMessageStub.called, 'Information message was not displayed.');

        updateStatusBarItemStub.restore();
        showInformationMessageStub.restore();
    });
});
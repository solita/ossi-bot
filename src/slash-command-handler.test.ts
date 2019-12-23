import {Config, ConfigKeys} from "./shared/config";

import { handleSlashCommand } from './slash-command-handler';
const auth = require('./slack-auth');
const { stringify } = require('querystring');
const interaction = require('./shared/slack-interaction');

jest.spyOn(interaction, 'getHelpMessage');

interaction.postModalBlock = jest.fn(() => ({statusCode: 200}));
interaction.listContributions= jest.fn(() => ({ statusCode: 200, body: 'Something bogus' }));

const mockEnv = {
    'VERSION': 'unittest',
    'ENVIRONMENT': 'unittest'
} as any;
Config.get = jest.fn((key: ConfigKeys) => mockEnv[key]);

const testEvent = (body: any) => {
    return {
        headers: {
            'X-Slack-Signature': 'v0=stub-signature',
            'X-Slack-Request-Timestamp': 12345,
        },
        body: stringify(body)
    };
};

describe('slash-command-handler.ts', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Should auth and return help for empty message text', async () => {
        auth.verifySignature = jest.fn(() => true);
        auth.getSecret = jest.fn(() => 'secret');
        const response = await handleSlashCommand(testEvent({ text: ''}));
        expect(response.statusCode).toEqual(200);
        expect(response.body).toEqual(expect.stringContaining('Ossi'))
        expect(auth.verifySignature)
            .toBeCalledWith(
                'v0=stub-signature',
                'secret',
                'v0:12345:text=');
        expect(interaction.getHelpMessage).toHaveBeenCalled();
    });

    it('Should return help for help', async () => {
        auth.verifySignature = jest.fn(() => true);
        auth.getSecret = jest.fn(() => 'secret');
        const response = await handleSlashCommand(testEvent({ text: 'help'}));
        expect(response.statusCode).toEqual(200);
        expect(response.body).toEqual(expect.stringContaining('Ossi'))
        expect(auth.verifySignature)
            .toBeCalledWith(
                'v0=stub-signature',
                'secret',
                'v0:12345:text=help');
        expect(interaction.getHelpMessage).toHaveBeenCalled();
    });

    it('Should open modal for new', async () => {
        auth.verifySignature = jest.fn(() => true);
        auth.getSecret = jest.fn(() => 'secret');
        const response = await handleSlashCommand(testEvent({ text: 'new'}));
        expect(response.statusCode).toEqual(200);
        expect(auth.verifySignature)
            .toBeCalledWith(
                'v0=stub-signature',
                'secret',
                'v0:12345:text=new');
        expect(interaction.postModalBlock).toHaveBeenCalledTimes(1);
    });

    it('Should list for list', async () => {
        auth.verifySignature = jest.fn(() => true);
        auth.getSecret = jest.fn(() => 'secret');
        const response = await handleSlashCommand(testEvent({ text: 'list'}));
        expect(response.statusCode).toEqual(200);
        expect(auth.verifySignature)
            .toBeCalledWith(
                'v0=stub-signature',
                'secret',
                'v0:12345:text=list');
        expect(interaction.listContributions).toHaveBeenCalledTimes(1);
    });

    it('Should auth and return 401 with invalid auth', async () => {
        auth.verifySignature = jest.fn(() => false);
        auth.getSecret = jest.fn(() => 'secret');
        const response = await handleSlashCommand(testEvent({ text: 'new'}));
        expect(response.statusCode).toEqual(401);
        expect(auth.verifySignature)
            .toBeCalledWith(
                'v0=stub-signature',
                'secret',
                'v0:12345:text=new');
    });


});

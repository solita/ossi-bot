
import { handler } from './slash-command-handler';
import * as auth from '../slack/slack-auth';
import {stringify} from 'querystring';
import * as interaction from '../slack/slack-interaction';
import {AppConfig, AppEnvVarKeys} from "../model/app-config";

jest.spyOn(interaction, 'getHelpMessage');

jest.spyOn(interaction, 'openCreateContributionModal').mockResolvedValue({statusCode: 200});
jest.spyOn(interaction, 'listContributions').mockResolvedValue({statusCode: 200, body: 'Something bogus'});

const mockEnv = {
    'VERSION': 'unittest',
    'ENVIRONMENT': 'unittest'
} as any;
AppConfig.getEnvVar = jest.fn((key: AppEnvVarKeys) => mockEnv[key]);



const testEvent = (body: any) => {
    return {
        headers: {
            'X-Slack-Signature': 'v0=stub-signature',
            'X-Slack-Request-Timestamp': 12345,
        },
        body: stringify(body)
    } as any;
};

describe('slash-command-handler.ts', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Should auth and return help for empty message text', async () => {
        jest.spyOn(auth, 'verifySignature').mockReturnValue(true);
        jest.spyOn(auth, 'getSecret').mockReturnValue(Promise.resolve("secret"));
        const response = await handler(testEvent({ text: ''}));
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
        jest.spyOn(auth, 'verifySignature').mockReturnValue(true);
        jest.spyOn(auth, 'getSecret').mockReturnValue(Promise.resolve("secret"));
        const response = await handler(testEvent({ text: 'help'}));
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
        jest.spyOn(auth, 'verifySignature').mockReturnValue(true);
        jest.spyOn(auth, 'getSecret').mockReturnValue(Promise.resolve("secret"));
        const response = await handler(testEvent({ text: 'new'}));
        expect(response.statusCode).toEqual(200);
        expect(auth.verifySignature)
            .toBeCalledWith(
                'v0=stub-signature',
                'secret',
                'v0:12345:text=new');
        expect(interaction.openCreateContributionModal).toHaveBeenCalledTimes(1);
    });

    it('Should list for list', async () => {
        jest.spyOn(auth, 'verifySignature').mockReturnValue(true);
        jest.spyOn(auth, 'getSecret').mockReturnValue(Promise.resolve("secret"));
        const response = await handler(testEvent({ text: 'list'}));
        expect(response.statusCode).toEqual(200);
        expect(auth.verifySignature)
            .toBeCalledWith(
                'v0=stub-signature',
                'secret',
                'v0:12345:text=list');
        expect(interaction.listContributions).toHaveBeenCalledTimes(1);
    });

    it('Should auth and return 401 with invalid auth', async () => {
        jest.spyOn(auth, 'verifySignature').mockReturnValue(false);
        jest.spyOn(auth, 'getSecret').mockReturnValue(Promise.resolve("secret"));
        const response = await handler(testEvent({ text: 'new'}));
        expect(response.statusCode).toEqual(401);
        expect(auth.verifySignature)
            .toBeCalledWith(
                'v0=stub-signature',
                'secret',
                'v0:12345:text=new');
    });


});

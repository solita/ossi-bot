import { handleEvent } from './event-handler';
const auth = require('./shared/slack-auth');

const interaction = require('./shared/slack-interaction');

const testEvent = (body: any) => {
    return {
        headers: {
            'X-Slack-Signature': 'v0=stub-signature',
            'X-Slack-Request-Timestamp': 12345,
        },
        body: JSON.stringify(body)
    } as any;
};


describe('event-handler.ts', () => {

    it('Should return 401 when authentication fails', async () => {
        auth.verifySignature = jest.fn(() => false);
        auth.getSecret = jest.fn(() => 'secret');
        const response = await handleEvent(testEvent({ }));
        expect(response.statusCode).toEqual(401);
        expect(auth.verifySignature)
            .toBeCalledWith(
                'v0=stub-signature',
                'secret',
                'v0:12345:{}');
    });

    it('Should return 200 OK with given challenge when received event contains challenge', async () => {
        auth.verifySignature = jest.fn(() => true);
        auth.getSecret = jest.fn(() => 'secret');
        const response =  await handleEvent(testEvent({ challenge: 'hiholetsgo' }));
        expect(response.statusCode).toEqual(200);
        expect(JSON.parse(response.body).challenge).toEqual('hiholetsgo');
    });

    it('Should do nothing for bot messages', async () => {
        auth.verifySignature = jest.fn(() => true);
        auth.getSecret = jest.fn(() => 'secret');
        const response =  await handleEvent(testEvent({ event: { channel: 'channelid', subtype: 'bot_message' } }));
        expect(response.statusCode).toEqual(200);
        expect(response.body).toBeUndefined();
    });

    it('Should reply with help message', async () => {

        interaction.postMessage = jest.fn(() => ({ statusCode: 200}));

        auth.verifySignature = jest.fn(() => true);
        auth.getSecret = jest.fn(() => 'secret');
        const response =  await handleEvent(testEvent({ event: { channel: 'channelid', subtype: 'message' } }));
        expect(response.statusCode).toEqual(200);
        expect(response.body).toBeUndefined();

        expect(interaction.postMessage).toHaveBeenCalledTimes(1);
    });


});
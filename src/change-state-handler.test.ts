import {Config, ConfigKeys} from "./shared/config";

const mockEnv = {
    'PUBLIC_CHANNEL': '#ossi'
} as any;
Config.get = jest.fn((key: ConfigKeys) => mockEnv[key]);

import {changeState} from './change-state-handler';

const auth = require('./shared/slack-auth');
const dynamo = require('./shared/dynamo');
const { stringify } = require('querystring');

const interaction = require('./shared/slack-interaction');
interaction.getHelpMessage = jest.fn();

const testEvent = (body: any) => {
    return {
        headers: {
            'X-Slack-Signature': 'v0=stub-signature',
            'X-Slack-Request-Timestamp': 12345,
        },
        body: stringify({ payload: JSON.stringify(body)})
    } as any;
};


describe('event-handler.ts', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Should return 401 when authentication fails', async () => {
        auth.verifySignature = jest.fn(() => false);
        auth.getSecret = jest.fn(() => 'secret');
        const response = await changeState(testEvent({}));
        expect(response.statusCode).toEqual(401);
        expect(auth.verifySignature)
            .toBeCalledWith(
                'v0=stub-signature',
                'secret',
                'v0:12345:payload=%7B%7D');
    });

    it('Should store contribution', async () => {
        auth.verifySignature = jest.fn(() => true);
        auth.getSecret = jest.fn(() => 'secret');
        dynamo.createNewContribution = jest.fn(() => Promise.resolve('foo-12345'));
        const response = await changeState(testEvent({
            type: 'view_submission',
            user: {
                id: 'foo'
            },
            view: {
                state: {
                    values: {
                        desc_input: {
                            description: {
                                value: 'My contribution'
                            }
                        },
                        url_input: {
                            url: {
                                value: 'https://www.foo.com'
                            }
                        },
                        comp_month_input: {
                            comp_month_val: {
                                selected_option: {
                                    value: '2019-12'
                                }
                            }
                        },
                        comp_lvl_input: {
                            comp_lvl_val: {
                                selected_option: {
                                    value: 'LARGE'
                                }
                            }
                        }
                    }
                }
            }

        }));

        expect(response.statusCode).toEqual(200);
        expect(dynamo.createNewContribution).toHaveBeenCalledTimes(1);
        expect(dynamo.createNewContribution).toHaveBeenCalledWith({
            id: 'foo',
            text: 'My contribution',
            url: 'https://www.foo.com',
            size: 'LARGE',
            contributionMonth: '2019-12'
        });
    });

    it('Should update contribution as accepted', async () => {
        auth.verifySignature = jest.fn(() => true);
        auth.getSecret = jest.fn(() => 'secret');
        dynamo.getContribution = jest.fn(() => Promise.resolve({
            id: 'foo',
            timestamp: 123456,
            size: 'SMALL',
            url: 'https://www.foo.com',
            contributionMonth: '2019-12',
            username: 'Mock Mockelson',
            text: 'My contribution',
            status: 'PENDING'
        }));
        dynamo.updateState = jest.fn(() => Promise.resolve());
        const response = await changeState(testEvent({
            callback_id: 'foo-123456',
            actions: [
                { value: 'accepted' }
            ]

        }));

        expect(response.statusCode).toEqual(200);
        expect(dynamo.updateState).toHaveBeenCalledTimes(1);
        expect(dynamo.updateState).toHaveBeenCalledWith(
            'foo',
            '123456',
            'ACCEPTED'
        );
    });

    it('Should update contribution as declined', async () => {
        auth.verifySignature = jest.fn(() => true);
        auth.getSecret = jest.fn(() => 'secret');
        dynamo.getContribution = jest.fn(() => Promise.resolve({
            id: 'foo',
            timestamp: 123456,
            size: 'SMALL',
            url: 'https://www.foo.com',
            contributionMonth: '2019-12',
            username: 'Mock Mockelson',
            text: 'My contribution',
            status: 'PENDING'
        }));
        dynamo.updateState = jest.fn(() => Promise.resolve());
        const response = await changeState(testEvent({
            callback_id: 'foo-123456',
            actions: [
                { value: 'declined' }
            ]
        }));

        expect(response.statusCode).toEqual(200);
        expect(dynamo.updateState).toHaveBeenCalledTimes(1);
        expect(dynamo.updateState).toHaveBeenCalledWith(
            'foo',
            '123456',
            'DECLINED'
        );
    });

});
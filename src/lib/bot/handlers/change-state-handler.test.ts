
import {handler} from './change-state-handler';

import * as auth from '../slack/slack-auth';
import * as contribution from '../model/contribution';
import {stringify} from 'querystring';

import * as interaction from '../slack/slack-interaction';

jest.spyOn(interaction, 'getHelpMessage').mockReturnValue('Help message');

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
        jest.spyOn(auth, 'verifySignature').mockReturnValue(false);
        jest.spyOn(auth, 'getSecret').mockReturnValue(Promise.resolve("secret"));
        // auth.verifySignature = jest.fn(() => false);
        // auth.getSecret = jest.fn(() => 'secret');
        const response = await handler(testEvent({}));
        expect(response.statusCode).toEqual(401);
        expect(auth.verifySignature)
            .toBeCalledWith(
                'v0=stub-signature',
                'secret',
                'v0:12345:payload=%7B%7D');
    });

    it('Should store contribution', async () => {
        jest.spyOn(auth, 'verifySignature').mockReturnValue(true);
        jest.spyOn(auth, 'getSecret').mockReturnValue(Promise.resolve("secret"));
        jest.spyOn(contribution, 'createNewContribution').mockResolvedValue('foo-12345');


        // auth.verifySignature = jest.fn(() => true);
        // auth.getSecret = jest.fn(() => 'secret');
        // contribution.createNewContribution = jest.fn(() => Promise.resolve('foo-12345'));
        const response = await handler(testEvent({
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
        expect(contribution.createNewContribution).toHaveBeenCalledTimes(1);
        expect(contribution.createNewContribution).toHaveBeenCalledWith({
            id: 'foo',
            text: 'My contribution',
            url: 'https://www.foo.com',
            size: 'LARGE',
            contributionMonth: '2019-12'
        });
    });

    it('Should update contribution as accepted', async () => {
        jest.spyOn(auth, 'verifySignature').mockReturnValue(true);
        jest.spyOn(auth, 'getSecret').mockReturnValue(Promise.resolve("secret"));

        jest.spyOn(contribution, 'getContribution').mockResolvedValue({
            id: 'foo',
            timestamp: 123456,
            size: 'SMALL',
            url: 'https://www.foo.com',
            contributionMonth: '2019-12',
            username: 'Mock Mockelson',
            text: 'My contribution',
            status: 'PENDING'
        })

        jest.spyOn(contribution, 'updateState').mockReturnValue(Promise.resolve());

        /*
        auth.verifySignature = jest.fn(() => true);
        auth.getSecret = jest.fn(() => 'secret');
        contribution.getContribution = jest.fn(() => Promise.resolve({
            id: 'foo',
            timestamp: 123456,
            size: 'SMALL',
            url: 'https://www.foo.com',
            contributionMonth: '2019-12',
            username: 'Mock Mockelson',
            text: 'My contribution',
            status: 'PENDING'
        }));
        contribution.updateState = jest.fn(() => Promise.resolve());

         */
        const response = await handler(testEvent({
            callback_id: 'foo-123456',
            actions: [
                { value: 'accepted' }
            ]

        }));

        expect(response.statusCode).toEqual(200);
        expect(contribution.updateState).toHaveBeenCalledTimes(1);
        expect(contribution.updateState).toHaveBeenCalledWith(
            'foo',
            '123456',
            'ACCEPTED'
        );
    });

    it('Should update contribution as declined', async () => {
        jest.spyOn(auth, 'verifySignature').mockReturnValue(true);
        jest.spyOn(auth, 'getSecret').mockReturnValue(Promise.resolve("secret"));

        jest.spyOn(contribution, 'getContribution').mockResolvedValue({
            id: 'foo',
            timestamp: 123456,
            size: 'SMALL',
            url: 'https://www.foo.com',
            contributionMonth: '2019-12',
            username: 'Mock Mockelson',
            text: 'My contribution',
            status: 'PENDING'
        })

        jest.spyOn(contribution,'updateState').mockReturnValue(Promise.resolve());

        /*
        auth.verifySignature = jest.fn(() => true);
        auth.getSecret = jest.fn(() => 'secret');
        contribution.getContribution = jest.fn(() => Promise.resolve({
            id: 'foo',
            timestamp: 123456,
            size: 'SMALL',
            url: 'https://www.foo.com',
            contributionMonth: '2019-12',
            username: 'Mock Mockelson',
            text: 'My contribution',
            status: 'PENDING'
        }));
        contribution.updateState = jest.fn(() => Promise.resolve());
        */
        const response = await handler(testEvent({

            callback_id: 'foo-123456',
            actions: [
                { value: 'declined' }
            ]
        }));

        expect(response.statusCode).toEqual(200);
        expect(contribution.updateState).toHaveBeenCalledTimes(1);
        expect(contribution.updateState).toHaveBeenCalledWith(
            'foo',
            '123456',
            'DECLINED'
        );
    });

});
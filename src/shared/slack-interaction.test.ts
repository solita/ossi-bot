import { listContributions, getHelpMessage } from "./slack-interaction";
import { Contribution } from "./model";
const dynamo = require('./dynamo');


describe('slack-interaction.ts', () => {

    describe('getHelpMessage()', () => {
        it('Should resolve values from environment', () => {
            return expect(getHelpMessage()).toEqual(expect.stringContaining('Ossi'))
        })
    });

    describe('listContributions()', () => {

        it('Should say, that you do not have contributions if one does not', () => {
            dynamo.getContributions = jest.fn(() => {
                return Promise.resolve([] as Contribution[])
            });
            return expect(listContributions('abc')).resolves.toMatchObject({
                statusCode: 200,
                body: expect.stringContaining('You do not have any contributions')
            });
        });

        it('Should list contributions in dynamo', () => {
            dynamo.getContributions = jest.fn(() => {
                return Promise.resolve([{
                    id: 'abc',
                    timestamp: 1,
                    size: 'SMALL',
                    status: 'PENDING',
                    text: 'This is my contribution',
                    username: 'Mock Mockelson'
                }] as Contribution[])
            });
            return expect(listContributions('abc')).resolves.toMatchObject({
                statusCode: 200,
                body: expect.stringContaining('This is my contribution')
            });
        });
    });


});

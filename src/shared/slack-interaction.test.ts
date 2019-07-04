import {listContributions, replyWithHelp, rollbackContribution} from "./slack-interaction";
import {Contribution} from "./model";
const dynamo = require('./dynamo');


describe('slack-interaction.ts', () => {

    describe('replyWithHelp()', () => {
        it('Should resolve values from environment', () => {
            return expect(replyWithHelp()).resolves.toMatchObject({
                statusCode: 200,
                body: expect.stringContaining('Ossi')
            });
        })
    });

    describe('rollbackContribution()', () => {
        it('Should call deleteEntry from dynamo', async () => {
            dynamo.deleteEntry = jest.fn(() => Promise.resolve());
            await rollbackContribution('abc-42');
            expect(dynamo.deleteEntry).toBeCalledWith('abc', '42');
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
                    privateChannel: '123',
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

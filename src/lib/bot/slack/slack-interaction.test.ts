import {listContributions, getHelpMessage, contributionFields, contributionColor} from "./slack-interaction";
import { Contribution } from "../model/model";
import moment from "moment-timezone";
import * as contribution from '../model/contribution';

describe('slack-interaction.ts', () => {

    const OLD_ENV = process.env;

    beforeEach(() => {
      jest.resetModules(); // this is important - it clears the cache
      process.env = { ...OLD_ENV };
      delete process.env.NODE_ENV;
      process.env.VERSION = 'TEST-VERSION';
      process.env.ENVIRONMENT = 'UNIT-TEST';
    });

    afterEach(() => {
      process.env = OLD_ENV;
    });

    describe('getHelpMessage()', () => {
        it('Should resolve values from environment', () => {
            const helpMessage = getHelpMessage();
            expect(helpMessage).toEqual(expect.stringContaining('Ossi'));
            expect(helpMessage).toEqual(expect.stringContaining('TEST-VERSION'));
            expect(helpMessage).toEqual(expect.stringContaining('UNIT-TEST'));
        })
    });

    describe('listContributions()', () => {

        it('Should say, that you do not have contributions if one does not', () => {
            jest.spyOn(contribution, 'getContributions').mockResolvedValue([]);
            return expect(listContributions('abc')).resolves.toMatchObject({
                statusCode: 200,
                body: expect.stringContaining('You do not have any contributions')
            });
        });

        it('Should list contributions in contribution', () => {
            jest.spyOn(contribution, 'getContributions').mockResolvedValue(
                [{
                    id: 'abc',
                    timestamp: 1,
                    size: 'SMALL',
                    status: 'PENDING',
                    text: 'This is my contribution',
                    username: 'Mock Mockelson'
                }])
            return expect(listContributions('abc')).resolves.toMatchObject({
                statusCode: 200,
                body: expect.stringContaining('This is my contribution')
            });
        });
    });

    describe('contributionColor()', () => {
        it('Should generate fields as expected', () => {

            const baseContribution: Contribution = {
                id: 'abc',
                timestamp: 12345,
                status: 'ACCEPTED',
                size: 'SMALL',
                username: 'Mock Mockelson',
                text: 'This is my contribution',
                contributionMonth: "2019-02",
                url: 'https://www.dummy.com'
            };
            expect(contributionColor(Object.assign(baseContribution, {status: "ACCEPTED"})))
                .toEqual('#36a64f');
            expect(contributionColor(Object.assign(baseContribution, {status: "DECLINED"})))
                .toEqual('#ff0000');
            expect(contributionColor(Object.assign(baseContribution, {status: "PENDING"})))
                .toEqual('#ffff00');
            expect(() => contributionColor(Object.assign(baseContribution, {status: "FOOBAR"})))
                .toThrow();
        });

    });

    describe('contributionFields()', () => {
        it('Should generate fields as expected', () => {
            const timestamp = 12345;
            const expectedTimestampFormat =
                moment(timestamp).tz('Europe/Helsinki').format('D.M.YYYY HH:mm:ss');
            const fields = contributionFields({
                timestamp,
                id: 'abc',
                status: 'ACCEPTED',
                size: 'SMALL',
                username: 'Mock Mockelson',
                text: 'This is my contribution',
                contributionMonth: "2019-02",
                url: 'https://www.dummy.com'
            });
            expect(fields).toEqual([
                {
                    title: 'Size',
                    value: 'SMALL',
                    short: true
                },
                {
                    title: 'Status',
                    value: 'ACCEPTED',
                    short: true
                },
                {
                    title: 'URL',
                    value: 'https://www.dummy.com',
                    short: true
                },
                {
                    title: 'Contribution month',
                    value: '2019-02',
                    short: true
                },
                {
                    title: 'Submitted',
                    value: expectedTimestampFormat,
                    short: true
                }]);
        });

        it('Should provide values for missing fields', () => {
            const timestamp = 12345;
            const expectedTimestampFormat =
                moment(timestamp).tz('Europe/Helsinki').format('D.M.YYYY HH:mm:ss');
            const fields = contributionFields({
                timestamp,
                id: 'abc',
                status: 'ACCEPTED',
                size: 'SMALL',
                username: 'Mock Mockelson',
                text: 'This is my contribution',
            });
            expect(fields).toEqual([
                {
                    title: 'Size',
                    value: 'SMALL',
                    short: true
                },
                {
                    title: 'Status',
                    value: 'ACCEPTED',
                    short: true
                },
                {
                    title: 'URL',
                    value: 'No URL available',
                    short: true
                },
                {
                    title: 'Contribution month',
                    value: 'No contribution month available',
                    short: true
                },
                {
                    title: 'Submitted',
                    value: expectedTimestampFormat,
                    short: true
                }]);
        });
    });
});

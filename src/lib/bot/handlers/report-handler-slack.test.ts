
import * as handler from './report-handler-slack';
import {Contribution} from "../model/model";
import * as interaction from '../slack/slack-interaction';
import * as contribution from '../model/contribution';
import {AppConfig, AppEnvVarKeys} from "../model/app-config";

const mockEnv = {
    'MANAGEMENT_CHANNEL_ID': '#ossi-management'
} as any;
AppConfig.getEnvVar = jest.fn((key: AppEnvVarKeys) => mockEnv[key]);

jest.spyOn(handler, 'writeToXlsxBuffer');

jest.spyOn(interaction, 'postFile').mockReturnValue(Promise.resolve());

jest.spyOn(interaction, 'postFile').mockReturnValue(Promise.resolve());
jest.spyOn(contribution, 'getContributionsForMonth').mockResolvedValue(Promise.resolve([
    {
        id: 'foo',
        timestamp: 12345,
        status: 'ACCEPTED',
        url: 'https://www.solita.fi',
        contributionMonth: '2019-01',
        text: 'My accepted contribution',
        username: 'Mock Mockelson',
        size: "SMALL"

    } as Contribution,
    {
        id: 'foo',
        timestamp: 12345,
        status: 'PENDING',
        url: 'https://www.solita.fi',
        contributionMonth: '2019-01',
        text: 'My pending contribution',
        username: 'Mock Mockelson',
        size: "SMALL"

    } as Contribution,
    {
        id: 'foo',
        timestamp: 12345,
        status: 'DECLINED',
        url: 'https://www.solita.fi',
        contributionMonth: '2019-01',
        text: 'My declined contribution',
        username: 'Mock Mockelson',
        size: "SMALL"

    } as Contribution,
]));


describe('monthly-report-handler.ts', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Should call postFile as expected and map contribution data correctly', async () => {
        await handler.handler({descriptor: '2019-01'});
        expect(interaction.postFile).toHaveBeenCalledTimes(1);
        expect(interaction.postFile).toHaveBeenCalledWith(
            '#ossi-management',
            `Here's the report of open source contributions :money_with_wings:`,
            expect.anything(), // This is the raw xlsx buffer. Mapping is tested with spy below
            '2019-01.xlsx'
        );

        expect(handler.writeToXlsxBuffer).toHaveBeenCalledTimes(1);
        expect(handler.writeToXlsxBuffer).toHaveBeenCalledWith([
            ['Slack ID', 'Target month', 'Timestamp', 'Name', 'Compensation', 'Description', 'URL'],
            ['foo', '2019-01', expect.any(String), 'Mock Mockelson', 'SMALL', 'My accepted contribution', 'https://www.solita.fi']
        ]);
    });


});

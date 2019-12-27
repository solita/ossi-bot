import {Config, ConfigKeys} from "./shared/config";

const handler =  require( './monthly-report-handler');
import {Contribution} from "./shared/model";
const interaction = require('./shared/slack-interaction');
const dynamo = require('./shared/dynamo');

jest.spyOn(handler, 'writeToXlsxBuffer');

interaction.postFile = jest.fn();
dynamo.getContributionsForMonth = jest.fn(() => Promise.resolve([
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

const mockEnv = {
    'MANAGEMENT_CHANNEL': '#ossi-management'
} as any;
Config.get = jest.fn((key: ConfigKeys) => mockEnv[key]);

describe('monthly-report-handler.ts', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Should call postFile as expected and map contribution data correctly', async () => {
        await handler.generateMonthlyReport({descriptor: '2019-01'});
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

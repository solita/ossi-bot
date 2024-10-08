import * as XLSX from 'xlsx';
import {getContributionsForMonth} from '../model/contribution';
import moment from 'moment-timezone';
import {Contribution} from "../model/model";
import {postFile} from '../slack/slack-interaction'
import {AppConfig} from "../model/app-config";

interface MonthlyReportEvent {
    descriptor?: string;
    month?: string;
}

function getContributionMonth(descriptor: string): string {
    if (descriptor) {
        return descriptor;
    }
    return moment().subtract(1, "month").format('YYYY-MM');
}

/**
 * Deprecated!
 * Fetches all contributions for previous month, puts data to Excel and sends it to management Slack channel
 */
export const handler = async (event: MonthlyReportEvent) => {
    const contributionMonthForReport = event.month ? event.month : getContributionMonth(event.descriptor!!);

    console.log(`Get contributions for month ${contributionMonthForReport}`);
    const contributions = await getContributionsForMonth(contributionMonthForReport)

    console.log(`Found ${contributions.length}`);
    const headerRowTable = [['Slack ID', 'Target month', 'Timestamp', 'Name', 'Compensation', 'Description', 'URL']];

    const dataToSend = contributions
        .filter(contribution => contribution.status === 'ACCEPTED')
        .reduce((all, contribution: Contribution) => all.concat(toContributionRowTable(contribution)), headerRowTable);

    console.log(`Sending report to ${AppConfig.getEnvVar('MANAGEMENT_CHANNEL_ID')}`);
    await postXlsxFile(
        AppConfig.getEnvVar('MANAGEMENT_CHANNEL_ID'),
        contributionMonthForReport,
        `Here's the report of open source contributions :money_with_wings:`,
        dataToSend)

};

const toContributionRowTable = (contribution: Contribution) => [[
    String(contribution.id),
    String(contribution.contributionMonth),
    moment(contribution.timestamp).tz('Europe/Helsinki').format('YYYY-MM-DD HH:mm:ss'),
    String(contribution.username),
    String(contribution.size),
    String(contribution.text),
    String(contribution.url)
]];

const postXlsxFile = async (channel: string, contributionMonth: string, message: string, data: any[][]) => {
    const xlsxBuffer = writeToXlsxBuffer(data);

    await postFile(channel, message, xlsxBuffer, `${contributionMonth}.xlsx`);
}

// Exported for spying on tests
export const writeToXlsxBuffer = (data: any[][]) => {
    const writingOptions: XLSX.WritingOptions = {bookType: 'xlsx', bookSST: false, type: 'buffer'};
    const workBook = XLSX.utils.book_new();
    const workSheet = XLSX.utils.aoa_to_sheet(data);

    XLSX.utils.book_append_sheet(workBook, workSheet);
    return XLSX.write(workBook, writingOptions);
}
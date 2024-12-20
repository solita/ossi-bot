import * as XLSX from 'xlsx';
import {getContributionsForMonth} from '../model/contribution';
import moment from 'moment-timezone';
import {Contribution} from "../model/model";
import {AppConfig} from "../model/app-config";
import {GetObjectCommand, PutObjectCommand, S3Client} from "@aws-sdk/client-s3";
import {loadConfig} from "@smithy/node-config-provider";
import {NODE_REGION_CONFIG_FILE_OPTIONS, NODE_REGION_CONFIG_OPTIONS} from "@smithy/config-resolver";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import {Duration} from "aws-cdk-lib";
import {postMessage} from "../slack/slack-interaction";

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
 * Fetches all contributions for previous month, puts data to Excel and sends it to management Slack channel
 */
export const handler = async (event: MonthlyReportEvent) => {
    const targetMonth = event.month ? event.month : getContributionMonth(event.descriptor!!);

    const contributions = await getContributionsForMonth(targetMonth)
    console.log(`Got contributions ${contributions.length} for month ${targetMonth}`);


    const acceptedContributions = contributions.filter(contribution => contribution.status === 'ACCEPTED');
    const pendingContributions = contributions.filter(contribution => contribution.status === 'PENDING');
    const declinedContributions = contributions.filter(contribution => contribution.status === 'DECLINED');

    if (acceptedContributions.length === 0) {
        console.log(`No contributions for ${targetMonth}`);
        return postMessage(
            AppConfig.getEnvVar('MANAGEMENT_CHANNEL_ID'),
            'Unfortunately there were no new accepted contributions for this month',
            []
        )
    }


    const headerRowTable = [['Slack ID', 'Target month', 'Timestamp', 'Name', 'Compensation', 'Description', 'URL']];
    const xlsxFile = writeToXlsxBuffer(acceptedContributions.reduce((all, contribution: Contribution) => all.concat(toContributionRowTable(contribution)), headerRowTable));
    const now = moment().tz('Europe/Helsinki').format('YYYY-MM-DD-HH-mm-ss');
    const fileName = `${now}-${targetMonth}-monthly-report.xlsx`;

    console.log(`Saving ${fileName} to S3`);
    const expiresIn = Duration.days(7);
    const expiresDate = moment().add(expiresIn.toSeconds(), 'seconds').format('YYYY-MM-DD HH:mm:ss');
    const downloadUrl = await saveWithPresignedUrl(AppConfig.getEnvVar('MONTHLY_REPORT_BUCKET'), fileName, xlsxFile, expiresIn);

    console.log(`Sending report url to ${AppConfig.getEnvVar('MANAGEMENT_CHANNEL_ID')}`);
    return postMessage(
        AppConfig.getEnvVar('MANAGEMENT_CHANNEL_ID'),
        `Great news everyone! Monthly report for ${targetMonth} is ready and in this month we got whopping ${acceptedContributions.length} accepted contributions!!`,
        [
            {
                fallback: 'fallback',
                color: '#36a64f',
                text: `<${downloadUrl}|Download report> (expires at ${expiresDate})`,
                fields: [
                    {
                        title: 'Accepted contributions',
                        value: String(acceptedContributions.length),
                        short: true
                    },
                    {
                        title: 'Pending contributions',
                        value: String(pendingContributions.length),
                        short: true
                    },
                    {
                        title: 'Declined contributions',
                        value: String(declinedContributions.length),
                        short: true
                    }
                ]
            }
        ]);
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

const saveWithPresignedUrl = async (bucket: string, fileName: string, xlsxFile: Buffer, expiresIn: Duration): Promise<string> => {
    const s3Client = new S3Client({
        region: await loadConfig(NODE_REGION_CONFIG_OPTIONS, NODE_REGION_CONFIG_FILE_OPTIONS)()
    });


    const putCommand = new PutObjectCommand({
        Bucket: bucket,
        Key: fileName,
        Body: xlsxFile,
        ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    const getCommand = new GetObjectCommand({
        Bucket: bucket,
        Key: fileName
    })

    try {
        await s3Client.send(putCommand)
        return await getSignedUrl(s3Client, getCommand, {expiresIn: expiresIn.toSeconds()});
    } catch (e) {
        console.error(`Error saving file ${fileName} to S3`, e);
        throw e;
    }
}


// Exported for spying on tests
export const writeToXlsxBuffer = (data: any[][]) => {
    const writingOptions: XLSX.WritingOptions = {bookType: 'xlsx', bookSST: false, type: 'buffer'};
    const workBook = XLSX.utils.book_new();
    const workSheet = XLSX.utils.aoa_to_sheet(data);

    XLSX.utils.book_append_sheet(workBook, workSheet);
    return XLSX.write(workBook, writingOptions);
}
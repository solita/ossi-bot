'use strict';

import { Config } from "./shared/config";
import * as XLSX from 'xlsx';
import axios from 'axios';
import { getContributionsForMonth } from './shared/dynamo';
import * as moment from 'moment-timezone';
import { Contribution } from "./shared/model";
import * as FormData from 'form-data';

/**
 * Fetches all contributions for previous month, puts data to Excel and sends it to management Slack channel
 */
export const generateMonthlyReport = () => {
  const contributionMonthForReport = moment().subtract(1, "month").format('YYYY-MM');  

  getContributionsForMonth(contributionMonthForReport).then(contributions => {
    const headerRowTable = [['Raportoijan slack-id', 'Kohdekuukausi', 'Raportin aikaleima', 'Nimi', 'Kompensaatio', 'Description', 'URL']];

    const dataToSend = contributions
      .filter(contribution => contribution.status === 'ACCEPTED')    
      .reduce((all, contribution: Contribution) => all.concat(toContributionRowTable(contribution)), headerRowTable);

    console.log(dataToSend);

    postXlsxFile(Config.get('MANAGEMENT_CHANNEL'), 'This is the monthly report', dataToSend)
  })
}

const toContributionRowTable = (contribution: Contribution) => [[
  String(contribution.id) , 
  String(contribution.contributionMonth), 
  moment(contribution.timestamp).tz('Europe/Helsinki').format('YYYY-MM-DD HH:mm:ss'), 
  String(contribution.username), 
  String(contribution.size), 
  String(contribution.text), 
  String(contribution.url)
]]

const postXlsxFile = (channel: string, message: string, data: any[][]) => {
   
  const xlsxBuffer = writeToXlsxBuffer(data);

  const formData = new FormData();
  formData.append('token', Config.get('SLACK_TOKEN'))
  formData.append('filename', 'test.xlsx');
  formData.append('file', xlsxBuffer, 'test.xlsx');
  formData.append('initial_comment', message);
  formData.append('channels', channel)
  
  return axios.post('	https://slack.com/api/files.upload', formData.getBuffer(), { headers: formData.getHeaders() })
  .then((result) => {
    console.log('Successful')
  })
  .catch(error => {
    console.error(`Error sending file `, error)
  });
}

const writeToXlsxBuffer = (data: any[][]) => {
  const writingOptions: XLSX.WritingOptions =  { bookType:'xlsx', bookSST:false, type:'buffer' };
  const workBook = XLSX.utils.book_new();
  const workSheet = XLSX.utils.aoa_to_sheet(data);

  XLSX.utils.book_append_sheet(workBook, workSheet);
  return XLSX.write(workBook,writingOptions);     
}
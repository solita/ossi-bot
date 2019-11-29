'use strict';

import { Config } from "./shared/config";
import * as XLSX from 'xlsx';
import axios from 'axios';

const FormData = require('form-data');

/**
 * TODO
 *
 * @param event
 */
export const generateMonthlyReport = (event: any) => {
    
  const data = [
    ['Raportoijan slack-id', 'Kohdekuukausi', 'Raportin aikaleima', 'Nimi', 'Kompensaatio', 'Description', 'URL'],
    ['Olli Sorje', 'November', '2019-11-25', 'Olli Sorje', 'SMALL', 'Hieno kuvausteksti', 'http://google.fi']
  ]
  
  postXlsxFile(Config.get('MANAGEMENT_CHANNEL'), 'This is the monthly report', data)

};

const postXlsxFile = (channel: string, message: string, data: Array<Array<any>>): Promise<any> => {

  const writingOptions: XLSX.WritingOptions =  { bookType:'xlsx', bookSST:false, type:'buffer' };
  const workBook = XLSX.utils.book_new();
  const workSheet = XLSX.utils.aoa_to_sheet(data);

  XLSX.utils.book_append_sheet(workBook, workSheet);
  const workBookBlob = XLSX.write(workBook,writingOptions);      
  

  const formData = new FormData();
  formData.append('token', Config.get('SLACK_TOKEN'))
  formData.append('filename', 'test.xlsx');
  formData.append('file', workBookBlob, 'test.xlsx');
  formData.append('initial_comment', message);
  formData.append('channels', channel)
  const formHeaders = formData.getHeaders();
  
  return axios.post('	https://slack.com/api/files.upload', formData.getBuffer(), {
    headers: {
        ...formHeaders,
        'Authorization': `Bearer ${Config.get('SLACK_TOKEN')}`
    }
  })
  .then((result) => {
    console.log('Successful')
    console.log(result)
    return ({ statusCode: 200 });
  })
  .catch(error => {
    console.error(`Error sending file `, error)
  })
}



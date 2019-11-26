'use strict';

import { Config } from "./shared/config";
import * as XLSX from 'xlsx'
import axios from "axios";

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

export function postXlsxFile(channel: string, message: string, data: Array<Array<any>): Promise<any> {

  
  const writingOptions: XLSX.WritingOptions =  { bookType:'xlsx', bookSST:false, type:'base64' };
  const workBook = XLSX.utils.book_new();
  const workSheet = XLSX.utils.aoa_to_sheet(data);

  XLSX.utils.book_append_sheet(workBook, workSheet);
  const workBookBlob = XLSX.write(workBook,writingOptions);      
  
  const formData = new FormData();
  formData.append('file', 'test.xlsx');
  formData.append('data',  workBookBlob);
  
  return axios.post('https://slack.com/api/chat.postMessage', {
      text: message,
      channel: channel
  }, {
      headers: {
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${Config.get('SLACK_TOKEN')}`
      },
      data: formData
  }).then(() => ({ statusCode: 200 }));
}



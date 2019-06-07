'use strict';

import { authLambdaEvent} from "./slack-auth";
import {deleteEntry, updateState} from "./dynamo";
const { parse } = require('querystring');

export const changeState = (event: any) => {
    if(!authLambdaEvent(event)) {
        return Promise.resolve({
            statusCode: 401,
            body: 'Invalid signature'
        })
    }
    const interaction = JSON.parse(parse(event.body).payload);
    const [id, seq] = interaction.callback_id.split('-');
    if(interaction.actions[0].value === 'cancel') {
        return deleteEntry(id, seq)
            .then(_ => {
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        text: 'Ok - I deleted your submitted text. Feel free to send a new one.'
                    })
                }
            });
    }
    if(interaction.actions[0].value === 'large') {
        return updateState(id, seq, 'LARGE')
            .then(_ => {
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        text: 'Nice! Big buck incoming - Valtteri will gert back to you'
                    })
                }
            });
    }
    if(interaction.actions[0].value === 'medium') {
        return updateState(id, seq, 'MEDIUM')
            .then(_ => {
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        text: 'Ok, small fee is a small fee'
                    })
                }
            });
    }
    if(interaction.actions[0].value === 'accepted') {
        return updateState(id, seq, 'ACCEPTED')
            .then(_ => {
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        text: 'Accepted this contribution'
                    })
                }
            });
    }
    if(interaction.actions[0].value === 'declined') {
        return updateState(id, seq, 'DECLINED')
            .then(_ => {
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        text: 'Declined this contribution'
                    })
                }
            });
    }
    if(interaction.actions[0].value === 'no') {
        return updateState(id, seq, 'NO')
            .then(_ => {
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        text: 'Good to know, that you are up tp something. OSSI appreciates.'
                    })
                }
            });
    }
    return Promise.resolve({
        statusCode: 200,
        body: JSON.stringify({
            text: 'I received something I don\'t understands!'
        })
    });
};


import {log} from 'console';
log('Setting up jest');

declare global {
    namespace jest {
        interface Matchers<R> {
            lambdaResponseWithStatusAndBodyContaining(a: number, b: any): R;
        }
    }
}



expect.extend({
    lambdaResponseWithStatusAndBodyContaining(receivedResponse: any, status: number, body: any) {
        if(receivedResponse.statusCode !== status) {
            return {
                pass: false,
                message: () => `Received status code ${receivedResponse.statusCode} expecting ${status}`,
            };
        }

        const receivedBody = JSON.parse(receivedResponse.body);

        if(!receivedBody) {
            return {
                pass: false,
                message: () => `Handler invocation did not return body`
            };
        }

        const pass = Object.keys(body).reduce((allFound: boolean, key: string) => {
            if(!allFound) {
                return false;
            }
            return this.equals(body[key], receivedBody[key]);
        }, true);


        const message = pass
            ? () => [
                `${this.utils.matcherHint('.lambdaResponse')}`,
                'Expected lambda response body to contain all of these:',
                `    ${this.utils.printExpected(body)}`,
                'But received response was:',
                `    ${this.utils.printReceived(receivedBody)}`,
            ].join('\n')
            : () => {
                return [
                    `${this.utils.matcherHint('.lambdaResponse')}`,
                    'Expected lambda response body to contain all of these:',
                    `    ${this.utils.printExpected(body)}`,
                    'But received response was:',
                    `    ${this.utils.printReceived(receivedBody)}`,
                ].join('\n');
            };
        return { pass, message };
    },
});

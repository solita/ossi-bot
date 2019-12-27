import { calculateSignature, verifySignature } from "./slack-auth";

describe('slack-auth.ts', () => {

    it('Should calculate signature', () => {
        expect(calculateSignature('xxxsecret', 'v0:123456789:command=/weather&text=94070'))
            .toEqual('v0=15a96f4c3573881a4b9f4ac5935af16898f426a943f78c36b6ae166ee4378434');
    });

    it('Should verify signature', () => {
        expect(verifySignature('v0=15a96f4c3573881a4b9f4ac5935af16898f426a943f78c36b6ae166ee4378434', 'xxxsecret', 'v0:123456789:command=/weather&text=94070'))
            .toBe(true);
        expect(verifySignature('v0=55a96f4c3573881a4b9f4ac5935af16898f426a943f78c36b6ae166ee4378434', 'xxxsecret', 'v0:123456789:command=/weather&text=94070'))
            .toBe(false);
    });
});
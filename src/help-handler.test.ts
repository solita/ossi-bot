import {help} from "./help-handler";

describe('help-handler.ts', () => {

    it('Should return promise resolving to expected value', () => {
        expect(help({})).resolves.toMatchObject({
            statusCode: 200,
            body: expect.any(String)
        });
    });

});
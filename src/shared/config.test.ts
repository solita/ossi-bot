import {Config, ConfigKeys} from "./config";

describe('config.ts', () => {

    const OLD_ENV = process.env;

    beforeEach(() => {
        jest.resetModules(); // this is important - it clears the cache
        process.env = {...OLD_ENV};
        delete process.env.SLACK_SIGNING_SECRET;
    });

    afterEach(() => {
        process.env = OLD_ENV;
    });

    it('Should resolve values from environment', () => {
        process.env.SLACK_SIGNING_SECRET = 'abc';
        expect(Config.get("SLACK_SIGNING_SECRET")).toEqual('abc');
    });

    it('Should throw if key is not in environment', () => {
        expect(() => Config.get("SLACK_SIGNING_SECRET"))
            .toThrow('Missing environment value SLACK_SIGNING_SECRET');
    });

    it('Should be mockable with jest', () => {
        const mockEnv = {
            'SLACK_SIGNING_SECRET': 'aaabee'
        } as any;
        Config.get = jest.fn((key: ConfigKeys) => mockEnv[key]);

        expect(Config.get("SLACK_SIGNING_SECRET"))
            .toEqual('aaabee');
    });
});

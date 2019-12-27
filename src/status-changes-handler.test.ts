import {Contribution} from "./shared/model";
import {handleStream} from './status-changes-handler';
import {Config, ConfigKeys} from "./shared/config";

const mockEnv = {
    'MANAGEMENT_CHANNEL': '#management',
    'PUBLIC_CHANNEL': '#public'
} as any;
Config.get = jest.fn((key: ConfigKeys) => mockEnv[key]);

const interaction = require('./shared/slack-interaction');

// By default, mocked post message with just succeed
interaction.postMessage = jest.fn(() => {
    return Promise.resolve({statusCode: 200 });
});

interaction.postInstantMessage = jest.fn(() => {
    return Promise.resolve({statusCode: 200 });
});


interface DynamoString {
    S: string
}

interface DynamoNumber {
    N: string
}

interface DynamoImage {
    id: DynamoString;
    timestamp: DynamoNumber;
    size: DynamoString;
    status: DynamoString;
    text: DynamoString;
    username: DynamoString;
    contributionMonth: DynamoString;
    url: DynamoString;
}

const createImage = (contribution: Contribution): DynamoImage => ({
    id: {S: contribution.id},
    timestamp: {N: contribution.timestamp.toString(10)},
    size: {S: contribution.size},
    status: {S: contribution.status},
    text: {S: contribution.text},
    username: {S: contribution.username},
    contributionMonth: {S: contribution.contributionMonth},
    url: {S: contribution.url}
});

const createEvent = (type: 'INSERT' | 'UPDATE' | 'REMOVE', newImage: DynamoImage, oldImage?: DynamoImage): any => {
    // Dynamo db sends the data as old image for REMOVE event
    let actualNewImage = newImage;
    let actualOldImage = oldImage;

    if (type === 'REMOVE') {
        actualNewImage = null;
        actualOldImage = newImage;
    }
    return {
        Records: [
            {
                eventID: "bogusbogusbogus",
                eventName: type,
                eventVersion: "1.1",
                eventSource: "aws:dynamodb",
                awsRegion: "eu-north-1",
                dynamodb: {
                    ApproximateCreationDateTime: 1577099755,
                    Keys: {
                        id: {
                            S: newImage.id.S
                        },
                        timestamp: {
                            N: newImage.timestamp.N
                        }
                    },
                    NewImage: actualNewImage,
                    OldImage: actualOldImage,
                    SequenceNumber: "13237100000000003778496382",
                    SizeBytes: 209,
                    StreamViewType: "NEW_AND_OLD_IMAGES"
                },
                eventSourceARN: "arn:aws:dynamodb:eu-north-1:bogusbogus:table/ossi-contributions-table-dev/stream/2019-12-20T13:31:27.834"
            }
        ]
    };
}

describe('status-changes-handler.ts', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Should do nothing for INSERT event', async () => {
        const event = createEvent('INSERT', createImage({
            contributionMonth: '2019-12',
            id: 'THEID',
            timestamp: 1233445678,
            size: 'SMALL',
            status: 'PENDING',
            text: 'My contribution',
            url: 'https://www.solita.fi/open-source',
            username: 'mockmockelson',
        }));

        return expect(handleStream(event)).resolves.toEqual({
            status: 'OK',
            message: 'NO_WORK'
        });
    });

    it('Should do nothing for REMOVE event', async () => {
        const event = createEvent('REMOVE', createImage({
            contributionMonth: '2019-12',
            id: 'THEID',
            timestamp: 1233445678,
            size: 'SMALL',
            status: 'PENDING',
            text: 'My contribution',
            url: 'https://www.solita.fi/open-source',
            username: 'mockmockelson',
        }));

        return expect(handleStream(event)).resolves.toEqual({
            status: 'OK',
            message: 'NO_WORK'
        });
    });

    it('Should notify management channel for PENDING contribution', async () => {
        const event = createEvent('UPDATE',
            createImage({
                contributionMonth: '2019-12',
                id: 'THEID',
                timestamp: 1233445678,
                size: 'SMALL',
                status: 'PENDING',
                text: 'My contribution',
                url: 'https://www.solita.fi/open-source',
                username: 'mockmockelson',
            }),
            createImage({
                contributionMonth: '2019-12',
                id: 'THEID',
                timestamp: 1233445678,
                size: 'SMALL',
                status: 'INITIAL',
                text: 'My contribution',
                url: 'https://www.solita.fi/open-source',
                username: 'mockmockelson',
            }));

        const response = await handleStream(event);

        expect(response.status).toEqual('OK');
        expect(response.message).toEqual('Notified management channel');

        expect(interaction.postMessage).toHaveBeenCalledTimes(1);
        expect(interaction.postMessage).toHaveBeenCalledWith(
            '#management',
            expect.stringContaining('mockmockelson'),
            [
                expect.objectContaining({
                    callback_id: 'THEID-1233445678',
                    fields: expect.anything(),
                    text: 'My contribution',
                    actions: expect.anything()
                })
            ]
        );
        expect(interaction.postInstantMessage).not.toHaveBeenCalled();
    });

    it('Should notify submitter for DECLINED contribution', async () => {
        const event = createEvent('UPDATE',
            createImage({
                contributionMonth: '2019-12',
                id: 'THEID',
                timestamp: 1233445678,
                size: 'SMALL',
                status: 'DECLINED',
                text: 'My contribution',
                url: 'https://www.solita.fi/open-source',
                username: 'mockmockelson',
            }),
            createImage({
                contributionMonth: '2019-12',
                id: 'THEID',
                timestamp: 1233445678,
                size: 'SMALL',
                status: 'PENDING',
                text: 'My contribution',
                url: 'https://www.solita.fi/open-source',
                username: 'mockmockelson',
            }));

        const response = await handleStream(event);

        expect(response.status).toEqual('OK');
        expect(response.message).toEqual('Notified submitter about declination');

        expect(interaction.postInstantMessage).toHaveBeenCalledTimes(1);
        expect(interaction.postInstantMessage).toHaveBeenCalledWith(
            'THEID',
            'Your contribution got processed!',
            [
                expect.objectContaining({
                    callback_id: 'THEID-1233445678',
                    fields: expect.anything(),
                    text: 'My contribution',
                })
            ]
        );
        expect(interaction.postMessage).not.toHaveBeenCalled();
    });

    it('Should notify submitter for ACCEPTED contribution and publish contribution to PUBLIC_CHANNEL', async () => {
        const event = createEvent('UPDATE',
            createImage({
                contributionMonth: '2019-12',
                id: 'THEID',
                timestamp: 1233445678,
                size: 'SMALL',
                status: 'ACCEPTED',
                text: 'My contribution',
                url: 'https://www.solita.fi/open-source',
                username: 'mockmockelson',
            }),
            createImage({
                contributionMonth: '2019-12',
                id: 'THEID',
                timestamp: 1233445678,
                size: 'SMALL',
                status: 'PENDING',
                text: 'My contribution',
                url: 'https://www.solita.fi/open-source',
                username: 'mockmockelson',
            }));

        const response = await handleStream(event);

        expect(response.status).toEqual('OK');
        expect(response.message).toEqual('Handled accepted message');

        expect(interaction.postInstantMessage).toHaveBeenCalledTimes(1);
        expect(interaction.postInstantMessage).toHaveBeenCalledWith(
            'THEID',
            'Your contribution got processed!',
            [
                expect.objectContaining({
                    callback_id: 'THEID-1233445678',
                    fields: expect.anything(),
                    text: 'My contribution',
                })
            ]
        );
        expect(interaction.postMessage).toHaveBeenCalledTimes(1);
        expect(interaction.postMessage).toHaveBeenCalledWith(
            '#public',
            expect.stringContaining('mockmockelson'),
            [
                expect.objectContaining({
                    callback_id: 'THEID-1233445678',
                    fields: expect.anything(),
                    text: 'My contribution',
                })
            ]
        );
    });

});

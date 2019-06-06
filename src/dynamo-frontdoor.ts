import {getContributions} from './dynamo';

export const query = (event: any) => {
    return getContributions('UFGGNJ87P')
        .then((res: any) => {
            return {
                statusCode: 200,
                body: JSON.stringify(res)
            };
        });
};

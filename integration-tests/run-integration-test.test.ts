import axios from 'axios';

const invokeGet = (url: string) => {
    return axios.post(url, { responseType: 'json' });
};

describe('OSSI Basic routes', () => {
    it('Should respond to help slash command', async () => {
        const response = await invokeGet('http://localhost:3000/help');

        expect(response.status).toBe(200);
        expect(response.data.response_type).toEqual('ephemeral');
        expect(response.data.text).toBeDefined();
    });
});
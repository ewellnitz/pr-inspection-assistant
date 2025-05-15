import tl from './taskWrapper';
import fetch from 'node-fetch';
import { Agent } from 'https';

export class AzureDevOps {
    private _httpsAgent: Agent;

    constructor() {
        this._httpsAgent = new Agent({
            rejectUnauthorized: false,
        });
    }

    public async get<T = any>(endpoint: string): Promise<T> {
        const response = await this.fetch({ endpoint });
        const result = (await response.json()) as T;
        tl.debug(`GET result: ${JSON.stringify(result)}`);

        return result;
    }

    public async post(endpoint: string, body: object): Promise<fetch.Response> {
        const response = await this.fetch({
            endpoint,
            method: 'POST',
            body,
        });
        return response;
    }

    public async patch(endpoint: string, body: object): Promise<fetch.Response> {
        const response = await this.fetch({
            endpoint,
            method: 'PATCH',
            body,
            overrides: {
                headers: {
                    Authorization: `Bearer ${tl.getVariable('System.AccessToken')}`,
                    'Content-Type': 'application/json-patch+json',
                },
            },
        });
        return response;
    }

    public async delete(endpoint: string): Promise<fetch.Response> {
        const response = await this.fetch({
            endpoint,
            method: 'DELETE',
        });
        return response;
    }

    public async fetch({
        endpoint,
        method = 'GET',
        body,
        overrides,
    }: {
        endpoint: string;
        method?: string;
        body?: any;
        overrides?: fetch.RequestInit;
    }): Promise<fetch.Response> {
        tl.debug(`ADO Fetching: ${method} ${endpoint} ${JSON.stringify(body ?? '')}`);
        const payload = {
            ...{
                headers: {
                    Authorization: `Bearer ${tl.getVariable('System.AccessToken')}`,
                    'Content-Type': 'application/json',
                },
                agent: this._httpsAgent,
                method,
                body: JSON.stringify(body),
            },
            ...overrides,
        };
        const response = await fetch(endpoint, payload);

        if (!response.ok) {
            tl.warning(`ADO Failed to fetch: ${method} ${endpoint}. Response: ${response.statusText}`);
        } else {
            tl.debug(`ADO Fetch success.`);
        }

        return response;
    }
}

import tl from "./taskWrapper";
import fetch from "node-fetch";
import { Agent } from "https";

export class AzureDevOps {
    private _httpsAgent: Agent;

    constructor() {
        this._httpsAgent = new Agent({
            rejectUnauthorized: false,
        });
    }

    public async Get<T = any>(endpoint: string): Promise<T> {
        const response = await this.Fetch({ endpoint });
        const result = (await response.json()) as T;
        tl.debug(`GET result ${result}`);

        return result;
    }

    public async Post(endpoint: string, body: object): Promise<fetch.Response> {
        const response = await this.Fetch({
            endpoint,
            method: "POST",
            body,
        });
        return response;
    }

    public async Patch(endpoint: string, body: object): Promise<boolean> {
        const response = await this.Fetch({
            endpoint,
            method: "PATCH",
            body,
            overrides: {
                headers: {
                    Authorization: `Bearer ${tl.getVariable(
                        "System.AccessToken"
                    )}`,
                    "Content-Type": "application/json-patch+json",
                },
            },
        });
        return response.ok;
    }

    public async Delete(endpoint: string): Promise<fetch.Response> {
        const response = await this.Fetch({
            endpoint,
            method: "DELETE",
        });
        return response;
    }

    public async Fetch({
        endpoint,
        method = "GET",
        body,
        overrides,
    }: {
        endpoint: string;
        method?: string;
        body?: any;
        overrides?: fetch.RequestInit;
    }): Promise<fetch.Response> {
        tl.debug(`ADO Fetching: ${method} ${endpoint} ${JSON.stringify(body)}`);
        const payload = {
            ...{
                headers: {
                    Authorization: `Bearer ${tl.getVariable(
                        "System.AccessToken"
                    )}`,
                    "Content-Type": "application/json",
                },
                agent: this._httpsAgent,
                method,
                body: JSON.stringify(body),
            },
            ...overrides,
        };
        const response = await fetch(endpoint, payload);

        if (!response.ok) {
            tl.warning(
                `ADO Failed to fetch: ${method} ${endpoint}. Response: ${response.statusText}`
            );
        } else {
            tl.debug(`ADO Fetch success.`);
        }

        return response;
    }
}

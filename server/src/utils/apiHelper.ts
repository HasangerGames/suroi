interface IPCheckResponse {
    flagged: boolean
    message: string
}

export interface Punishment {
    readonly id: string
    readonly ip: string
    readonly reportId: string
    readonly reason: string
    readonly reporter: string
    readonly expires?: number
    readonly punishmentType: "warn" | "temp" | "perma"
}

class IPChecker {
    private readonly baseUrl: string;
    private readonly apiKey: string;

    /**
     * Constructs an instance of IpChecker.
     * @param baseUrl - The base URL of the API (e.g., 'https://api.example.com')
     * @param apiKey - The API key to be sent in the 'api-key' header
     */
    constructor(baseUrl: string, apiKey: string) {
        this.baseUrl = baseUrl.replace(/\/+$/, ""); // Remove trailing slashes
        this.apiKey = apiKey;
    }

    /**
     * Checks if the given IP is flagged by the API.
     * If any error occurs, it returns { flagged: false, message: 'IP is not a proxy/VPN' }
     * @param ip - The IP address to check
     * @returns A promise that resolves to an IPCheckResponse
     */
    async check(ip: string): Promise<IPCheckResponse> {
        try {
            this.validateIP(ip);
            const url = `${this.baseUrl}/${ip}`;

            const headers = {
                "api-key": this.apiKey
            };

            const response = await fetch(url, {
                method: "GET",
                headers: headers
            });

            return await this._handleResponse<IPCheckResponse>(response);
        } catch (e) {
            // If any error occurs, return that the IP is not a proxy/VPN
            console.error("Error checking IP. Details:", e);
            return {
                flagged: false,
                message: "IP is not a proxy/VPN"
            };
        }
    }

    /**
     * Validates the IP address format.
     * @param ip - The IP address to validate
     */
    private validateIP(ip: string): void {
        const ipRegex
        = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;
        if (!ipRegex.test(ip)) {
            throw new Error(`Invalid IP address: ${ip}`);
        }
    }

    /**
     * Handles the API response, checking for errors and parsing JSON.
     * If the response is not OK, it returns an IpCheckResponse indicating IP is not a proxy/VPN.
     * @param response - The fetch Response object
     * @returns A promise that resolves to the parsed response data
     */
    private async _handleResponse<T>(response: Response): Promise<T> {
        const contentType = response.headers.get("Content-Type");
        let data: T | string;

        if (contentType?.includes("application/json")) {
            data = (await response.json()) as T;
        } else {
            data = await response.text();
        }

        if (!response.ok) {
        // Instead of throwing an error, return an IpCheckResponse indicating IP is not a proxy/VPN
            return {
                flagged: false,
                message: "IP is not a proxy/VPN"
            } as unknown as T;
        }

        return data as T;
    }
}

export default IPChecker;

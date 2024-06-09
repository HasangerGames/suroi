import * as https from "https";
// FIXME this should be in a .env!
export const mod_api_data = {
    API_SERVER_URL: "api server url",
    API_SERVER_KEY: "Server Key",
    API_WEBHOOK_URL: "Logging webhook"
};

/**
 * Sends a POST request to the specified URL with the given data.
 * @param url URL to contact
 * @param data Data to send
 * @returns Promise resolving to the response data
 */
export const sendPostRequest = (url: string, data: unknown): Promise<string> => {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(data);

        const options: https.RequestOptions = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "api-key": mod_api_data.API_SERVER_KEY
            }
        };

        const req = https.request(url, options, res => {
            let responseData = "";

            res.on("data", chunk => {
                responseData += String(chunk);
            });

            res.on("end", () => {
                resolve(responseData);
            });
        });

        req.on("error", (error: Error) => {
            reject(error);
        });

        req.write(payload);
        req.end();
    });
};

/**
 * Sends a GET request to the specified URL with the given data as query parameters.
 * @param url URL to contact
 * @param data Data to send as query parameters
 * @returns Promise resolving to the response data
 */
export const sendGetRequest = (url: string, data: unknown): Promise<string> => {
    return new Promise((resolve, reject) => {
        const queryString = new URLSearchParams(data as Record<string, string>).toString();
        const fullUrl = `${url}?${queryString}`;

        const options: https.RequestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "api-key": mod_api_data.API_SERVER_KEY
            }
        };

        const req = https.request(fullUrl, options, res => {
            let responseData = "";

            res.on("data", chunk => {
                responseData += String(chunk);
            });

            res.on("end", () => {
                resolve(responseData);
            });
        });

        req.on("error", (error: Error) => {
            reject(error);
        });

        req.end();
    });
};

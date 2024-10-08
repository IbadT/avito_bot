export const avitoGetAccessToken = async (
    client_id: string, client_secret: string
): Promise<string> => {
    try {
        // const client_id = "DJHLUBhgJYFi_1wey4bV";
        // const client_secret = "BeoZ3pBoIyfnbgHYYCBlmD_Y7wY843hV-7Frt3kb";
        const url = "https://api.avito.ru/token";
  
        const params = new URLSearchParams();
            params.append('client_id', client_id);
            params.append('client_secret', client_secret);
            params.append('grant_type', 'client_credentials');
        
        const response = await fetch(url, {
            method: "POST",
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString()
        });
        const { access_token } = await response.json();
        return access_token
    } catch ({ message }) {
        console.log(message);
        return message;
    }
}
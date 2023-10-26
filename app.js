const express = require("express");
const https = require('https');
const axios = require('axios');


const app = express();
const port = process.env.PORT || 3001;



function generateRequestId() {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	const hours = String(now.getHours()).padStart(2, '0');
	const minutes = String(now.getMinutes()).padStart(2, '0');
	const seconds = String(now.getSeconds()).padStart(2, '0');
	return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

const httpsAgent = new https.Agent({
	rejectUnauthorized: false, // add this if you want to ignore unauthorized SSL certificates
	secureProtocol: 'TLSv1_2_method' // or 'TLSv1_3_method' based on your requirements
});
  

app.get("/geocoding", async (req, res) => {
	const query = req.query.query;
	const token = req.query.token;
	const host = req.query.host;
	const port = req.query.port;
	const username = req.query.username;
	const password = req.query.password;
	if (!query || !token || !host || !port) {
		return res.json({
			type: 'error',
			status: 403,
			message: 'query, token and proxy are required'	
		})
	}
	try {

		const proxy = { host, port }
		if (username && password) {
			proxy.auth = {
				username,
				password
			}
		}
		console.log(proxy);
		const url = 'https://www.google.com/search'
		const params = {
			gl: "dz",
			tbm: "map",
			q: query,
			nfpr: 1,
			pb: token
		}
		const response = await axios.get(url, { params, proxy, httpsAgent })
		const requestId = generateRequestId()
		if (response.status === 200) {
			const content = response.data.replace(')]}\'\n', '');
			const data = JSON.parse(content)

			const item = data[0][1]
			const result = []
			let index = 0

			// eslint-disable-next-line no-plusplus
			for (let i = 0; i < item.length; i++) {
				let adr = {}
				try {
					const element = item[i][14]
					if (element[30] === 'Africa/Algiers') {
						adr = {
							'query': query,
							'request_id': requestId,
							'index': index,
							"coordinate": [element[9][2], element[9][3]],
							'data_0': element[0],
							'data_1': element[1],
							'data_2': element[2],
							'data_3': element[10],
							'data_4': element[11],
							'data_5': element[13],
							'data_6': element[14],
							'data_7': element[18],
						}
						index += 1
					}

				} catch (error) { }
				if (Object.keys(adr).length > 0) {
					result.push(adr)
				}

			}

			return res.json({
				type: "success",
				data: result
			})

		}
		
		return res.json({
			type: 'error',
			status: response.status,
			message: response.data
		})
	} catch (error) {
		return res.json({
			type: 'error',
			status: 500,
			message: error
		})
	}



});

const server = app.listen(port, () => console.log(`Example app listening on port ${port}!`));

server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;


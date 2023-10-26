const express = require("express");
const https = require('https');
const axios = require('axios');
const fs = require('fs');
const { HttpsProxyAgent } = require('https-proxy-agent');
// const fetch = require('node-fetch');
// import fetch from 'node-fetch'



const app = express();
const port = process.env.PORT || 3001;


// const httpsServer = https.createServer(credentials, app);


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
	const proxy = req.query.proxy;
	if (!query || !token) {
		return res.json({
			type: 'error',
			status: 403,
			message: 'query, token and proxy are required'	
		})
	}
	try {

		const axiosInstance = axios.create({
			httpsAgent: proxy ? new HttpsProxyAgent(proxy) : undefined 
		});


		console.log('proxy', proxy ? proxy : ' -x- not proxy -x-');
		const url = 'https://www.google.com/search'
		// const url = 'https://api.ipify.org'
		const params = {
			gl: "dz",
			tbm: "map",
			q: query,
			nfpr: 1,
			pb: token
		}
		const response = await axiosInstance.get(url, { params })
		
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


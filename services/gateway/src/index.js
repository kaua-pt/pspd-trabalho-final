const express = require('express');
const cors = require('cors');
const axios = require('axios');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- Endereços dos Microsserviços ---
// Usamos 'localhost' para testes locais fora do Docker. 
// No Docker, os nomes dos serviços (ex: 'url-shortener-rest') serão usados.
const URL_SHORTENER_REST_API = process.env.URL_SHORTENER_REST_API || 'http://localhost:8083';
const QR_GENERATOR_REST_API = process.env.QR_GENERATOR_REST_API || 'http://localhost:8082';
const LINK_SHORTENER_GRPC_API = process.env.LINK_SHORTENER_GRPC_API || 'localhost:5001';
const QR_GENERATOR_GRPC_API = process.env.QR_GENERATOR_GRPC_API || 'localhost:5003';

// --- Configuração dos Clientes gRPC ---
const PROTO_PATH_LINK = path.resolve(__dirname, './protos/linkshortener.proto');
const packageDefinitionLink = protoLoader.loadSync(PROTO_PATH_LINK);
const linkProto = grpc.loadPackageDefinition(packageDefinitionLink).linkshortener;
const grpcLinkClient = new linkProto.LinkShortener(LINK_SHORTENER_GRPC_API, grpc.credentials.createInsecure());

const PROTO_PATH_QR = path.resolve(__dirname, './protos/qrcode.proto');
const packageDefinitionQR = protoLoader.loadSync(PROTO_PATH_QR);
const qrProto = grpc.loadPackageDefinition(packageDefinitionQR).qrcode;
const grpcQrClient = new qrProto.QrCodeGenerator(QR_GENERATOR_GRPC_API, grpc.credentials.createInsecure());


// --- Rotas do Gateway ---

app.post('/url', async (req, res) => {
    const protocol = (req.headers['x-protocol-choice'] || 'rest').toLowerCase();
    const { url } = req.body;
    
    const startTime = performance.now();
    let responseData;

    console.log(protocol, req.headers)
    
    try {
        if (protocol === 'grpc') {
            console.log(`Forwarding to gRPC URL Shortener: ${LINK_SHORTENER_GRPC_API}`);
            responseData = await new Promise((resolve, reject) => {
                grpcLinkClient.createLink({ url }, (error, response) => {
                    if (error) return reject(error);
                    resolve(response);
                });
            });
        } else { // rest
            console.log(`Forwarding to REST URL Shortener: ${URL_SHORTENER_REST_API}`);
            const result = await axios.post(`${URL_SHORTENER_REST_API}/api/v1/url/shorten`, { url: url });
            responseData = result.data;
        }
        
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        res.json({ ...responseData, responseTime });

    } catch (error) {
        console.error("Error in /url endpoint:", error.message);
        res.status(500).json({ message: error.message, details: error.details || 'No details' });
    }
});

app.post('/qr', async (req, res) => {
    const protocol = (req.headers['x-protocol-choice'] || 'rest').toLowerCase();
    const { text } = req.body;

    const startTime = performance.now();
    let responseData;
    
    console.log(protocol, req.headers)
    
    try {
        if (protocol === 'grpc') {
            console.log(`Forwarding to gRPC QR Generator: ${QR_GENERATOR_GRPC_API}`);
            responseData = await new Promise((resolve, reject) => {
                grpcQrClient.generateQrCode({ text }, (error, response) => {
                    if (error) return reject(error);
                    resolve(response);
                });
            });
        } else { // rest
            console.log(`Forwarding to REST QR Generator: ${QR_GENERATOR_REST_API}`);
            const result = await axios.post(`${QR_GENERATOR_REST_API}/api/v1/qr/generate`, { data: text });
            responseData = result.data;
        }

        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        res.json({ ...responseData, responseTime });

    } catch (error) {
        console.error("Error in /qr endpoint:", error.message);
        res.status(500).json({ message: error.message, details: error.details || 'No details' });
    }
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});


const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});

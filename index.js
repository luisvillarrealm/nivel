var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var Prisma = require('./prismaclient').getPrismaInstance();
const net = require('net');
const port = 8888;
// Creamos una instancia de nuestro servidor web para obtener la gráfica básica y con /data para obtener la informacion inicial de la tabla
app.get('/', function (req, res) {
    
    res.sendFile(__dirname + '/index.html');
});
app.get('/data', async (req, res) => {
    const data = await Prisma.presa.findMany({
        orderBy: {
            id: 'desc'
        },
        take: 10
    })
    res.json(data);
})
// Aquí lo iniciamos escuchando por el puerto 3001
http.listen(3001, function () {
    console.log('listening on *:3001');
});

// Utilizamos io para escuchar eventos, en este caso el evento 'connection' que se dispara cuando un cliente se conecta
io.on('connection', function (socket) {
    console.log('a user connected');
    socket.on('disconnect', function () {
        console.log('user disconnected');
    });
    socket.on('chat message', function (msg) {
        console.log('message: ' + msg);
    });
});
// Creamos un servidor TCP para que escuche las conexiones entrantes, guarde la información y luego la envíe a nuestro cliente web

const onClientConnection = async (sock) => {
    // Cuando se conecta un cliente, lo mostramos en la consola
    console.log(`${sock.remoteAddress}:${sock.remotePort} Connected`);
    //Cargamos la información de la base de datos
    const data = await Prisma.presa.findMany({
        orderBy: {
            id: 'desc'
        },
        take: 10
    })
    // Enviamos la información a nuestro cliente web
    io.emit('message', data);

    // Cuando recibimos información del cliente, la mostramos en la consola y la guardamos en la base de datos
    sock.on('data', async function (data) {
        //Log data received from the client
        console.log(`>> data received : ${data} `);
        if (!isNaN(parseFloat(data))) {
            const created = await Prisma.presa.create({
                data: {
                    value: parseFloat(data)
                }
            });
            if (created) {
    
                const data = await Prisma.presa.findMany({
                    orderBy: {
                        id: 'desc'
                    },
                    take: 10
                })
                //console.log(data);
                io.emit('message', data);
            }
        }
        
        //prepare and send a response to the client 
        let serverResp = "Datos Recibidos y Guardados\n"
        sock.write(serverResp);

        //close the connection 
        //sock.end()        
    });

    // Cuando el cliente se desconecta, lo mostramos en la consola
    sock.on('close', function () {
        console.log(`${sock.remoteAddress}:${sock.remotePort} Connection closed`);
    });

    // Cuando ocurre un error, lo mostramos en la consola
    sock.on('error', function (error) {
        console.error(`${sock.remoteAddress}:${sock.remotePort} Connection Error ${error}`);
    });
}
//=================================================


//Creamos una instancia del servidor TCP y lo ponemos a escuchar por el puerto 8888
const server = net.createServer(onClientConnection);
server.listen(port, function () {
    console.log(`Server started on port ${port}`);
});

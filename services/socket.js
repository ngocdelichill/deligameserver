class SocketServices{

    connection( socket ){
        socket.on('disconnect', () => {
            console.log(`User disconnect id is ${socket.id}`);
        })

        socket.on('chat message', msg => {
            console.log(`msg is:::${msg}`)
            _io.emit('chat message', msg)
        })

        
    }
}

module.exports = new SocketServices();
web: cd server && gunicorn --bind 0.0.0.0:$PORT --worker-class geventwebsocket.gunicorn.workers.GeventWebSocketWorker -w 1 server:app

package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"streamify/Internals/chat"
	"streamify/Internals/video"
)

func main() {
	setupApp()

	log.Println("listning and serving")
	var port = os.Getenv("PORT");

	if port == "" {
		port = "3000"
	}

	log.Fatal(http.ListenAndServe(":" + port, nil))
}

func setupApp(){
	http.Handle("/", http.FileServer(http.Dir("./web/views")))

	output := http.FileServer(http.Dir("./web/static")) 
	http.Handle("/static/", http.StripPrefix("/static/", output))

	ctx := context.Background()

	video.AllRooms.Init()

	//create new manager for websocket traffic
	manager := chat.NewManager(ctx)
	http.HandleFunc("/ws", manager.ServeWebSocket)
	http.HandleFunc("/create-room", video.CreateRoomRequestHandler)
	http.HandleFunc("/join-room", video.JoinRoomRequestHandler)
}
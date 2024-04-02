package video

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

var AllRooms RoomMap

type response struct {
	RoomID	string	`json:"room_id"`		
}

type BroadcastMessage struct {
	Message		map[string]interface{}
	RoomID		string
	Client		*websocket.Conn
}

var broadcast = make(chan BroadcastMessage) 

func broadcaster() {
	for {
		msg := <- broadcast
		for _, client := range AllRooms.Map[msg.RoomID] {
			if(client.Conn != msg.Client) {
				client.Mutex.Lock()
				defer client.Mutex.Unlock()
				
				err := client.Conn.WriteJSON(msg.Message)
				if err != nil {
					log.Fatal(err)
					client.Conn.Close()
				}
			}
		}
	}
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func CreateRoomRequestHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")

	roomID := AllRooms.CreateRoom()

	json.NewEncoder(w).Encode(response{RoomID: roomID})
}

func JoinRoomRequestHandler(w http.ResponseWriter, r *http.Request) {
	query, ok := r.URL.Query()["roomID"]

	if !ok {
		log.Println("roomID is missing, unable to join the call")
		return
	}

	roomID := query[0]

	ws, err := upgrader.Upgrade(w, r, nil)

	if err != nil {
		log.Fatal("Unable to upgrade http to websocket", err)
	}

	AllRooms.InsertIntoRoom(roomID, false, ws)

	go broadcaster()

	for {
		var msg BroadcastMessage

		err := ws.ReadJSON(&msg.Message)
		if err != nil {
			log.Fatal(err)
		}

		msg.Client = ws
		msg.RoomID = roomID

		broadcast <- msg
	}
}
package video

import (
	"math/rand"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type Participant struct {
	Host bool
	ID   string
	Conn *websocket.Conn
	Mutex sync.Mutex
}

type RoomMap struct {
	Mutex 	sync.RWMutex
	Map 	map[string][]Participant
}

//initialize room map
func (r *RoomMap) Init() {
	r.Map = make(map[string][]Participant)
}

//get all participant in a room
func (r *RoomMap) Get(roomID string)[]Participant {
	r.Mutex.RLock()
	defer r.Mutex.RUnlock()

	return r.Map[roomID]
}

//create a room
func (r *RoomMap) CreateRoom() string {
	r.Mutex.Lock()
	defer r.Mutex.Unlock()

	rand.New(rand.NewSource(time.Now().UnixNano()))
	var letters = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123456789")
	b := make([]rune, 8)

	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}

	roomID := string(b)
	r.Map[roomID] = []Participant{}

	return roomID
}

//join a room handler
func (r *RoomMap) InsertIntoRoom(roomID string, host bool, conn *websocket.Conn) {
	r.Mutex.Lock()
	defer r.Mutex.Unlock()

	clientID := uuid.New().String()
	incomingParticipant := Participant{host, clientID, conn, sync.Mutex{}}

	r.Map[roomID] = append(r.Map[roomID], incomingParticipant)
}

//delete a room
func (r *RoomMap) DeleteRoom(roomID string) {
	r.Mutex.Lock()
	defer r.Mutex.Unlock()

	delete(r.Map, roomID)
}
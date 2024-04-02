package chat

import (
	"encoding/json"
	"time"
)

type Event struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

type EventHandler func (event Event, c *Client) error

const (
	EventSendMessage = "send_message"
	EventIncomingMessage = "incoming_message"
)

type NewMessageEvent struct {
	Message		string 		`json:"message"`
	From		string		`json:"From"`
	TimeSent	time.Time	`json:"timeSent"`
}

type SendMessageEvent struct {
	Message		string 	`json:"message"`
	From		string	`json:"From"`
}
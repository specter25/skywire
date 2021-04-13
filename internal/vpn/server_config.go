package vpn

// ServerConfig is a configuration for VPN server.
type ServerConfig struct {
	Docker   bool
	Passcode string
	Secure   bool
}

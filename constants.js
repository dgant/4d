const constants = {};
// Units:
// * 1 distance unit = 1 meter
// * 1 unit of time = 1 ms
// Treat all constants as eg. meters, seconds, meters per second (per second), etc.
constants.gridSize = 2;
constants.mapSize = 12;
// Height/eye level taken as gender-averaged from
// https://www.firstinarchitecture.co.uk/average-male-and-female-dimensions/
constants.playerHeight = 1.675;
constants.playerEyeLevel = 1.567;
constants.playerRadius = 0.25;
constants.playerGravity = 4 * 9.8; // 9.8 would be realistic, but due to higher jump height feels too floaty.
constants.playerJumpHeight = constants.gridSize * 1.2;
constants.playerJumpVelocity = Math.sqrt(2 * constants.playerGravity * constants.playerJumpHeight);
constants.playerTopSpeedRun = 8; // Humans: 8m/s sprint, 3m/s jog, 1.8 m/s walk
constants.playerTopSpeedWalkMultiplier = 0.4;
constants.playerTopSpeedTotal = 64; // Top speed including falling; restricted to allow setting physicsMaxStep
constants.playerStrafeMultiplier = 0.65;
constants.playerDecelTime = 0.25;
constants.playerAccelTime = 0.75;
constants.playerDecel = constants.playerTopSpeedRun / constants.playerDecelTime;
constants.playerAccel = constants.playerTopSpeedRun / constants.playerAccelTime + constants.playerDecel;
constants.physicsMaxStep = constants.playerRadius / constants.playerTopSpeedTotal / 3; // Ensure we update frequently enough to collide properly

export default constants;
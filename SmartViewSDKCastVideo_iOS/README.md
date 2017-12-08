# SmartViewSDK CastVideo Sample App #

## Prerequisite

### 1. [SmartView SDK iOS framework](http://www.samsungdforum.com/AddLibrary/SmartViewDownload):  iOS Package(Mobile)
	
	add smartview.framework
	
### 2. Build Environment
1. This code is developed using Objective-C language.
2. Required XCode version 7.2 for XCODE70 and version 8.2 for XCODE80
	

### 3. Discover : Search devices around your mobile.
1. Pressing 'Cast' button in ActionBar, must start search API [ss start].
2. Populate device list by overriding onServiceFound() & onServiceLost() listeners.
3. Stop device discovery, by calling stop search API [ss stop].

### 4.Code Snippet with Examples:

## Discover ##

```objective-c

//Inside TvSelectViewController.m file


ServiceSearch *ss;
NSArray *serviceArray;
NSMutableArray *serviceBLEArray;

Application *_app;

static DataManager* instance = nil;

@implementation DataManager
+(DataManager*)getInstance
{
if (instance == nil) {
@synchronized(self) {
instance = [[self alloc]init];
}
}
return instance;
}

/* Start TV Discovery */

-(void)startSearch
 ss = [Service search];
 [ss start];
 [ss startUsingBLE];
}

/*
* Method to update (add) new service (tv).
* event recieved when service(tv) found on Network.
*/

- (void)onServiceFound:(Service * __nonnull)service
{
 serviceArray = [ss getServices];
 [tvTableView reloadData];
}

/// The ServiceSearch will call this delegate method when a service is lost
///
/// param service The lost service

- (void)onServiceLost:(Service * __nonnull)service
{
 serviceArray = [ss getServices];
 [tvTableView reloadData];
}


/* Stop TV Discovery */
-(void)stopSearch
{
[ss stop];
[ss stopUsingBLE];
}

```

## Launch TV application ##

```objective-c

// Inside DataManager.m file

-(void)lunchApplicationToTv: (Service*)service
{
//   NSString *url =@"1234"; // appId or app id on tv when install
NSString *appID = @"YcKEdWMZve.MultiScreenPlayer";

NSString *channelId = @"com.samsung.MultiScreenPlayer";

NSLog(@"input: createApplication:(appId):%@ channelURI: %@  args: %@",appID,  channelId, nil);

_app = [service createApplication:appID channelURI:channelId args:nil];
_app.delegate = self;
_app.connectionTimeout = 5.0f;

[self notify:USER_NOTIFICATION_CONNECTING];
[_app connect];


_connectedService = service;

}

/// Called when the Channel is connected
///
/// \param client The Client that just connected to the Channel
///
/// \param error An error info if any
- (void)onConnect:(ChannelClient * __nullable)client error:(NSError * __nullable)error
{
  NSLog(@"onConnect: client: %@   error: %@",client, error);
  if (error == nil) {
  timerAppNotAnswerOfReady = [NSTimer scheduledTimerWithTimeInterval:18.0f target:self selector:@selector(cannotCommunicateWithTvApp) userInfo:nil repeats:NO];
  }
}

/// Called when the Channel is disconnected
///
/// \param client The Client that just disconnected from the Channel
///
/// \param error An error info if any

- (void)onDisconnect:(ChannelClient * __nullable)client error:(NSError * __nullable)error
{
  NSLog(@"onDisconnect:client: %@ error: %@", client, error);
  [self notify:USER_NOTIFICATION_DISCONNECTED];

  ViewController *vc = (ViewController *)self.mainViewController;
  if (vc != nil) {
  [vc viewStyleUpdateToTable];
  self.isConnectedTvApp = NO;
}

}
/* Share Content on TV */
 [[DataManager getInstance].app publishWithEvent:@"play" message:json];
 
```

## API usage ##

```objective-c

- (IBAction)onRewindCastBtn:(id)sender {
NSString *json = @"{\"keycode\":\"MediaRewind\"}";
[[DataManager getInstance].app publishWithEvent:@"keydown" message:json];
}

- (IBAction)onPlayPauseCastBtn:(UIButton*)sender {
sender.selected = !sender.selected;
NSString *json = @"{\"keycode\":\"MediaPlayPause\"}";
[[DataManager getInstance].app publishWithEvent:@"keydown" message:json];
}

- (IBAction)onStopCastBtn:(id)sender {
NSString *json = @"{\"keycode\":\"MediaStop\"}";
[[DataManager getInstance].app publishWithEvent:@"keydown" message:json];
[self viewStyleChange:ViewStyleOptionContentsTable];
}

- (IBAction)onForwardCastBtn:(id)sender {
NSString *json = @"{\"keycode\":\"MediaFastForward\"}";
[[DataManager getInstance].app publishWithEvent:@"keydown" message:json];
}

- (IBAction)onVolumeDownBtn:(id)sender {
NSString *json = [NSString stringWithFormat:@"{\"value\":%d}", (volume > 0)?--volume:volume];
[[DataManager getInstance].app publishWithEvent:@"volume" message:json];
[self volumeShow];
}

- (IBAction)onVolumeUpBtn:(id)sender {
NSString *json = [NSString stringWithFormat:@"{\"value\":%d}", (volume < 100)?++volume:volume];
[[DataManager getInstance].app publishWithEvent:@"volume" message:json];
[self volumeShow];
}


//#pragma mark Local Movie Control
- (IBAction)onRewindBtn:(id)sender {
float ti = moviePlayer.currentPlaybackTime;
moviePlayer.currentPlaybackTime = ti -15;
NSLog(@"playbackTime: %f ---> %f",ti, moviePlayer.currentPlaybackTime);
}

```


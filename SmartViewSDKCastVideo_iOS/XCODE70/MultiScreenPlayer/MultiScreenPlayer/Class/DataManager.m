
#import "DataManager.h"
#import "ViewController.h"
#import "Util.h"

@interface DataManager ()<ChannelDelegate>
{
    // Application launch
    Application *_app;
    Service *_connectedService;
    NSTimer *timerAppNotAnswerOfReady;
    
}
@end

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

#pragma mark - function


-(void)cannotCommunicateWithTvApp
{
    if (timerAppNotAnswerOfReady) {
        [timerAppNotAnswerOfReady invalidate];
        timerAppNotAnswerOfReady = nil;
        [self disconnectQuick:NO];
    }

    [Util showSimpleMessage:@"Information" withText:@"Application Launch Timeout!!"];
    [self disconnectQuick:YES];
    [self notify:USER_NOTIFICATION_DISCONNECTED];
}

- (void)disconnectQuick:(BOOL)isRunning
{
    if (_app != nil) {
        [_app disconnectWithLeaveHostRunning:isRunning]; // Not working on some tv device
//        [_app disconnectWithLeaveHostRunning:YES];
    }
    [self terminateConnection];
}

- (void)terminateConnection
{
    self.connectedService = nil;
    self.isConnectedTvApp = NO;
}

-(void)lunchApplicationToTv: (Service*)service
{
    
    //   NSString *url =@"1234"; // appId or app id on tv when install
    NSString *appID = @"YcKEdWMZve.SmartViewSDKCastVideo";
    
    NSString *channelId = @"com.samsung.MultiScreenPlayer";
    
    NSLog(@"input: createApplication:(appId):%@ channelURI: %@  args: %@",appID,  channelId, nil);
    
    _app = [service createApplication:appID channelURI:channelId args:nil];
    _app.delegate = self;
    _app.connectionTimeout = 5.0f;
    
    NSDictionary *dic = @{@"name":@"iPhoneMobile"}; //All the channel client can know this value.
    //   NSDictionary *dic = @{@"name":@"Mobile"};
    
    [self notify:USER_NOTIFICATION_CONNECTING];
    [_app start:^(BOOL isSuccess, NSError * _Nullable error) {
        NSLog(@"app start: %@, error: %@",isSuccess?@"YES":@"NO", error);
        if (isSuccess) {
            [_app connect:dic];
            
        }else{
            
            NSLog(@"app start: FAIL!!!!!!!!!");
            [self notify:USER_NOTIFICATION_DISCONNECTED];
            [Util showSimpleMessage:@"App not found" withText:@"Application on TV not found"];

        }
    }];
    
    
    _connectedService = service;
    
}

#pragma mark - Property
- (void)setIsFindDevice:(BOOL)isFind
{
    if (isFind == _isFindDevice) {
        return;
    }
    _isFindDevice = isFind;
    [self notify:USER_NOTIFICATION_DEVICE_FIND_STATUS_CHANGE];
}
#pragma mark - <ChannelDelegate>
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

/// Called when the host app is ready to send or receive messages
- (void)onReady
{
    NSLog(@"onReady");
    if (timerAppNotAnswerOfReady) {
        [timerAppNotAnswerOfReady invalidate];
        timerAppNotAnswerOfReady = nil;
    }
    [DataManager getInstance].isConnectedTvApp = YES;
    [self notify:USER_NOTIFICATION_READY];
    //   [self dismissViewControllerAnimated:NO completion:nil];
    
    // continue play: cast play <-- local play data after connection
    NSLog(@"self.castPlayDataStringForAfterConnection: %@",self.castPlayDataStringForAfterConnection);
    if (self.castPlayDataStringForAfterConnection) {
        [_app publishWithEvent:@"play" message:self.castPlayDataStringForAfterConnection];
        self.castPlayDataStringForAfterConnection = nil;
    }
}


/// Called when the Channel receives a text message
///
/// \param message Text message received
- (void)onMessage:(Message * __nonnull)message
{
    [self parseMessage:message];
}

-(void)parseMessage:(Message * __nonnull)message
{
//    NSLog(@"onMessage: %@,  message.event: %@, message.from: %@, message.data: %@", message, message.event, message.from, message.data);
    if ([message.event isEqualToString:@"status"]) {
        NSData *data = [message.data dataUsingEncoding:NSUTF8StringEncoding];
        NSDictionary *dic = [NSJSONSerialization JSONObjectWithData:data options:NSJSONReadingAllowFragments error:nil];
        //        NSLog(@"dic: %@", dic);
        [(ViewController*)self.mainViewController statusChangeFromTv:dic];
        
    } else {
        NSLog(@"onMessage: %@,  message.event: %@, message.from: %@, message.data: %@", message, message.event, message.from, message.data);
        //    NSLog(@"message.data's Class name: %s",  object_getClassName(message.data));
        
        if ([message.event isEqualToString:@"error"] && [[message.data objectForKey:@"code"]integerValue] ==403) {
            
            [Util showSimpleMessage:@"Access denied" withText:@"Maximum limit of connected user reached"];
            [[DataManager getInstance] disconnectQuick: YES];
            
        }else  if ([message.event isEqualToString:@"error"] && [[message.data objectForKey:@"code"]integerValue] ==9998) {
            // Tv avplay exception for fast forware/rewind/seek
            NSLog(@"fast Forware/rewind/seek :avplay exception at jumpForward: %@", message.data);
            return;
            
        }else  if ([message.event isEqualToString:@"error"]){
            // Tv avplay exception for fast forware/rewind/seek
            [Util showSimpleMessage:@"Error" withText:[message.data objectForKey:@"message"]];
            NSLog(@"error: %@", message.data);
            return;
            
        }else{
            if ([message.event isEqualToString:@"suspend"]) {
                [self notify:USER_NOTIFICATION_SUSPEND];
                self.isConnectedTvApp = NO;
                return;
            }else if ([message.event isEqualToString:@"restore"]) {
                self.isConnectedTvApp = YES;
                [self notify:USER_NOTIFICATION_RESTORE];
                return;
            }
        
            if ([message.event isEqualToString:@"ready"]) {
                // (other) client of channel connected
                return;
            }else{
                // other client can say...
                NSLog(@"ME: %@ \nClientSendMsg: %@",_app.me , message.from);
                [Util showSimpleMessage:message.event withText:[NSString stringWithFormat:@"%@",message.data]];
            }
            
        }
    }
}

/// Called when the Channel receives a binary data message
///
/// \param message Text message received
///
/// \param payload Binary payload data
- (void)onData:(Message * __nonnull)message payload:(NSData * __nonnull)payload
{
    NSLog(@"onData:message:%@ payload: %@", message, payload);
}

/// Called when a client connects to the Channel
///
/// \param client The Client that just connected to the Channel
- (void)onClientConnect:(ChannelClient * __nonnull)client
{
    NSLog(@"onClientConnect: %@", client);
    
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
    
    if(error.code == 32 ){
        //Code=32 "Broken pipe" when iOS close socket
    }
}

/// Called when a client disconnects from the Channel
///
/// \param client The Client that just disconnected from the Channel
- (void)onClientDisconnect:(ChannelClient * __nonnull)client{
    NSLog(@"onClientDisconnect: %@", client);
}

/// Called when a Channel Error is fired
///
/// \param error The error
- (void)onError:(NSError * __nonnull)error
{
    NSLog(@"onError: %@", error);
}

#pragma mark - Custom Notification Send
/// Posts a MyNotification message whenever called
- (void)notify:(NSString* )notificationName {
    [[NSNotificationCenter defaultCenter] postNotificationName:notificationName object:self];
}


@end

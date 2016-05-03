
#import <Foundation/Foundation.h>
#import <SmartView/SmartView.h>

#define USER_NOTIFICATION_READY         @"USER_NOTIFICATION_READY"
#define USER_NOTIFICATION_CONNECTING    @"USER_NOTIFICATION_CONNECTING"
#define USER_NOTIFICATION_DISCONNECTED  @"USER_NOTIFICATION_DISCONNECTED"
#define USER_NOTIFICATION_SUSPEND       @"USER_NOTIFICATION_SUSPEND"
#define USER_NOTIFICATION_RESTORE       @"USER_NOTIFICATION_RESTORE"
#define USER_NOTIFICATION_DEVICE_FIND_STATUS_CHANGE    @"USER_NOTIFICATION_DEVICE_FIND_STATUS_CHANGE"


@interface DataManager : NSObject

// ViewController
@property (nonatomic, assign) UIViewController *mainViewController;

@property (nonatomic, assign) BOOL isConnectedTvApp;
@property (nonatomic, assign) BOOL isFindDevice;


// Application launch & Casting
@property (nonatomic, retain) Application *app;
@property (nonatomic, retain) Service *connectedService; 

- (void)disconnectQuick:(BOOL)isRunning;
-(void)lunchApplicationToTv: (Service*)service;

// cast play <--> local play data after connection
@property (nonatomic, retain)  NSString *castPlayDataStringForAfterConnection;

#pragma mark - function
+(DataManager*)getInstance;

@end

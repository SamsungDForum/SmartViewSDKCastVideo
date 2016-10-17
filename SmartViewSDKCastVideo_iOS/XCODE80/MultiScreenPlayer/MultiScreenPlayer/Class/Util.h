#import <Foundation/Foundation.h>

@interface Util : NSObject
// contents time format change
//  0:10:53 typ -> float second
+(float)timeFromString:(NSString*)timeString;
//  mili second ---> 0:10:53
+(NSString*)timeStringFromInteger:(int)miliSecond;

// message alert
+ (void)showSimpleMessage:(NSString * )title withText:(NSString*)text;

@end

#import "Util.h"
#import <UIKit/UIKit.h>

@implementation Util

//  mili second ---> 0:10:53
+(NSString*)timeStringFromInteger:(int)miliSecond
{
    int second = miliSecond*0.001;
    int hr, mm, ss;
    hr = second/(60*60);
    mm = (second - hr *60*60)/60;;
    ss = second%60;
    
    NSString *tempString = nil;
    if (hr >0) {
        tempString = [NSString stringWithFormat:@"%d", hr];
    }
    if (tempString != nil) {
        tempString = [NSString stringWithFormat:@"%@:%02d",tempString, mm ];
    }else{
        tempString = [NSString stringWithFormat:@"%d", mm];
    }
    
    if (tempString != nil) {
        tempString = [NSString stringWithFormat:@"%@:%02d",tempString, ss ];
    }else{
        tempString = [NSString stringWithFormat:@"00:%02d", ss];
    }
    return tempString;
}


//  0:10:53 typ -> float second
+(float)timeFromString:(NSString*)timeString
{
    NSArray* list = [timeString componentsSeparatedByString:@":"];
    
    float value = [list[0] intValue]*60*60 + [list[1] intValue]*60 + [list[2] intValue];
    return value;
}

// message alert
+ (void)showSimpleMessage:(NSString * )title withText:(NSString*)text
{
    dispatch_async(dispatch_get_main_queue(), ^{
        UIAlertView *av = [[UIAlertView alloc]initWithTitle:title message:text delegate:nil cancelButtonTitle:@"OK" otherButtonTitles:nil, nil];
        [av show];
    });
}


@end

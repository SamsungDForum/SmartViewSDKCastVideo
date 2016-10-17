
#import <UIKit/UIKit.h>


// 3 type view style
enum ViewStyleOption{
    ViewStyleOptionMovieDefault,
    ViewStyleOptionCastMovie,
    ViewStyleOptionContentsTable,
};

@interface ViewController : UIViewController

-(void)statusChangeFromTv: (NSDictionary *)dic;
-(void)viewStyleUpdateToTable;
-(void)showConnectionGuideDialogBox;
@end


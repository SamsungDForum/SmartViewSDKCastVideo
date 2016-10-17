
#import <UIKit/UIKit.h>

@interface ContentTableViewCell : UITableViewCell
@property(nonatomic, weak)IBOutlet UILabel *titleLabel;
@property(nonatomic, weak)IBOutlet UILabel *countLabel;
@property(nonatomic, weak)IBOutlet UILabel *timeLabel;
@property (weak, nonatomic) IBOutlet UIImageView *movieImageView;
@property (weak, nonatomic) IBOutlet UIActivityIndicatorView *indicator;


@end

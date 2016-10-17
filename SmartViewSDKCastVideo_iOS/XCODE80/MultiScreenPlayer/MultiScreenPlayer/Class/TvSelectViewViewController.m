#import "TvSelectViewViewController.h"
#import "DataManager.h"
#import "ViewController.h"

@interface TvSelectViewViewController ()<ServiceSearchDelegate, UITableViewDataSource, UITableViewDelegate>
{
    // Discovery
    ServiceSearch *ss;
    NSArray *serviceArray;
    NSMutableArray *serviceBLEArray;

    __weak IBOutlet UITableView *tvTableView;
    __weak IBOutlet UIActivityIndicatorView *activityIndicator;
    
    __weak IBOutlet NSLayoutConstraint *tableViewHeightConstraint;
    
    // Not Found(15 seconds)
    NSTimer *notFoundTimer;
    NSUInteger totalTableCellCount;
}
@end


@implementation TvSelectViewViewController

#pragma mark - event handling
- (IBAction)onCancelBtn:(id)sender {
    [self stopSearch];
    [self dismissViewControllerAnimated:NO completion:nil];
}

#pragma mark - function
-(void)stopSearch
{
    [ss stop];
    [ss stopUsingBLE];
}

-(void)deviceNotFound
{
    if (notFoundTimer) {
        [notFoundTimer invalidate];
        notFoundTimer = nil;
    }
    NSLog(@"notFoundTimer fired");
    
    [self stopSearch];
    [tvTableView reloadData];
    
}

#pragma mark - life cycle
- (void)viewDidLoad {
    [super viewDidLoad];
    
    serviceBLEArray = [NSMutableArray array];
    // Do any additional setup after loading the view.
    self.view.backgroundColor = [UIColor colorWithRed:100/255 green:100/255 blue:100/255 alpha:0.7f];
    
    tvTableView.delegate = self;
    tvTableView.dataSource = self;

    ss = [Service search];
    NSLog(@"ServiceSearch *ss: %@", ss);
    
    ss.delegate = self;
    [ss start];
    [ss startUsingBLE];

    // Device Not Found
    notFoundTimer = [NSTimer scheduledTimerWithTimeInterval:15 target:self selector:@selector(deviceNotFound) userInfo:nil repeats:NO];
    
    activityIndicator.layer.cornerRadius = 18;
}

- (void)didReceiveMemoryWarning {
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}


#pragma mark - <UITableViewDataSource, UITableViewDelegate>
- (void)tableView:(UITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)indexPath
{
    [activityIndicator stopAnimating];
    NSUInteger count = [serviceArray count];
    if (indexPath.row < count) {
        Service *service = [serviceArray objectAtIndex:indexPath.row];
        [DataManager getInstance].connectedService = service;
        [[DataManager getInstance] lunchApplicationToTv:service];
    }else{
        [self stopSearch];
        [self dismissViewControllerAnimated:NO completion:nil];
        [(ViewController*)[DataManager getInstance].mainViewController showConnectionGuideDialogBox];
    }
    
    if (notFoundTimer) {
        [notFoundTimer invalidate];
        notFoundTimer = nil;
    }
    [self stopSearch];
    [self dismissViewControllerAnimated:NO completion:nil];
}

- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section
{
    NSUInteger totalCount = serviceBLEArray.count + serviceArray.count;
    
    if (notFoundTimer == nil) {
        ++totalCount;
    }
    totalTableCellCount = totalCount;
    [self updateTableSize];
    return totalCount;
}

- (void)updateTableSize
{
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.1 * NSEC_PER_SEC)),     dispatch_get_main_queue(), ^{
        float maxHeight = [UIScreen mainScreen].bounds.size.height -30;
//        NSInteger row = totalTableCellCount==0?1:totalTableCellCount;
        float tempHeight = tvTableView.frame.origin.y+ 45 + totalTableCellCount*60;
        if (tempHeight > maxHeight) {
            tempHeight = maxHeight;
        }
        tableViewHeightConstraint.constant = tempHeight;
        [DataManager getInstance].isFindDevice = (serviceArray.count>0)?YES:NO;
    });
}

- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)indexPath
{
    UITableViewCell *cell;
    NSUInteger totalCount = serviceBLEArray.count + serviceArray.count;
    if (indexPath.row == totalCount) {
        cell = [tvTableView dequeueReusableCellWithIdentifier:@"tvNotFoundCell"];
        cell.textLabel.text = @"Missing a device?" ;
    }else if(indexPath.row < [serviceArray count]){
        // Wifi
        cell = [tvTableView dequeueReusableCellWithIdentifier:@"tvCell"];
        Service *service = [serviceArray objectAtIndex:indexPath.row];
        cell.textLabel.text = [NSString stringWithFormat:@"%@",service.name] ;
    }else{
        //BLE & Other Network Service
        cell = [tvTableView dequeueReusableCellWithIdentifier:@"tvNotFoundCell"];
        cell.textLabel.text = [NSString stringWithFormat:@"%@",serviceBLEArray[indexPath.row - serviceArray.count]] ;
    }
    return cell;
}


#pragma mark - <ServiceSearchDelegate>
- (void)onServiceFound:(Service * __nonnull)service
{
    NSLog(@"onServiceFound: %@", service);
    NSLog(@"getServices: %@",[ss getServices]);
    [DataManager getInstance].isFindDevice = YES;
    serviceArray = [ss getServices];
    [tvTableView reloadData];
}

/// If BLE device is found
- (void)onFoundOnlyBLE:(NSString * _Nonnull)NameOfTV
{
    NSLog(@"onFoundOnlyBLE:NameOfTV: %@", NameOfTV);
    [self addBLEServiceName:NameOfTV];
    NSLog(@"serviceBLEArray: %@",serviceBLEArray);
    [tvTableView reloadData];
   
}

/// Find other network (other than BLE)
- (void)onFoundOtherNetwork:(NSString * _Nonnull)NameOfTV
{
    NSLog(@"onFoundOtherNetwork:NameOfTV: %@", NameOfTV);
    [self addBLEServiceName:NameOfTV];
    NSLog(@"serviceBLEArray: %@",serviceBLEArray);
    [tvTableView reloadData];
}



-(void)addBLEServiceName:(NSString*)serviceName
{
    for (int i= 0; i<  serviceBLEArray.count; i++) {
        NSString* name = serviceBLEArray[i];
        if ([serviceName isEqualToString:name]) {
            return;
        }
    }
    [serviceBLEArray addObject:serviceName];
    [tvTableView reloadData];
}

-(void)removeBLEServiceName:(NSString*)serviceName
{
    for (int i= 0; i<  serviceBLEArray.count; i++) {
        NSString* name = serviceBLEArray[i];
        if ([serviceName isEqualToString:name]) {
            [serviceBLEArray removeObjectAtIndex:i];
            return;
        }
    }
}


/// The ServiceSearch will call this delegate method when a service is lost
///
/// \param service The lost service
- (void)onServiceLost:(Service * __nonnull)service
{
    NSLog(@"onServiceLost: %@", service);
    NSLog(@"getServices: %@",[ss getServices]);
    serviceArray = [ss getServices];
    [tvTableView reloadData];
}

/// The ServiceSearch will call this delegate method after stopping the search
- (void)onStop
{
    NSLog(@"search onStop");
    [activityIndicator stopAnimating];
}

/// The ServiceSearch will call this delegate method after the search has started
- (void)onStart{
    [activityIndicator startAnimating];
    NSLog(@"search onStart");
}

#pragma mark - Interface Orientation
- (void)didRotateFromInterfaceOrientation:(UIInterfaceOrientation)fromInterfaceOrientation
{
    [self updateTableSize];
}

@end

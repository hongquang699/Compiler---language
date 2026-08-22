#include <bits/stdc++.h>
using namespace std;

#define fast_io ios_base::sync_with_stdio(false); cin.tie(NULL)

int main() {
    fast_io;
    int n;
    if (cin >> n) {
        vector<int> a(n);
        long long sum = 0;
        for (int i = 0; i < n; ++i) {
            cin >> a[i];
            sum += a[i];
        }
        cout << sum << "\n";
    }
    return 0;
}
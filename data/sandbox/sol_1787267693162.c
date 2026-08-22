#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) == 1) {
        long long sum = 0;
        for (int i = 0; i < n; ++i) {
            int val;
            scanf("%d", &val);
            sum += val;
        }
        printf("%lld\n", sum);
    }
    return 0;
}
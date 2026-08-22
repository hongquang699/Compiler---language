# Java Competitive Programming & Fast I/O Template

Trong Java, `Scanner` rất chậm và thường bị TLE khi $N \ge 10^5$. Hãy dùng `BufferedReader` kết hợp `StringTokenizer` hoặc class `FastScanner`.

```java
import java.io.*;
import java.util.*;

public class Main {
    static class FastScanner {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer st = new StringTokenizer("");

        String next() {
            while (!st.hasMoreTokens()) {
                try {
                    String line = br.readLine();
                    if (line == null) return null;
                    st = new StringTokenizer(line);
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
            return st.nextToken();
        }

        int nextInt() {
            return Integer.parseInt(next());
        }

        long nextLong() {
            return Long.parseLong(next());
        }

        double nextDouble() {
            return Double.parseDouble(next());
        }
    }

    public static void main(String[] args) {
        FastScanner in = new FastScanner();
        PrintWriter out = new PrintWriter(new BufferedOutputStream(System.out));

        // Logic bài toán
        // out.println("Output");

        out.flush();
    }
}
```
